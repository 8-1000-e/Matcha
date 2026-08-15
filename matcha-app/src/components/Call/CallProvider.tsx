"use client";

import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
	useSyncExternalStore,
	type ReactNode,
} from "react";
import {
	endCall,
	getIceConfig,
	openCall,
	sendSignal,
	type IceConfig,
} from "@/lib/calls/client";
import { CALL_END, CALL_RING, CALL_SIGNAL } from "@/lib/calls/events";
import {
	callsSupported,
	createPeer,
	InsecureContextError,
	MicrophoneError,
	type Peer,
} from "@/lib/calls/peer";
import { startRingtone } from "@/lib/calls/ringtone";
import type { SignalKind } from "@/lib/calls/validation";
import type { CallStatus } from "@/lib/db";
import { chatChannel } from "@/lib/realtime/channels";
import { subscribe } from "@/lib/realtime/client";

export type CallPhase = "idle" | "calling" | "ringing" | "connecting" | "active";

export interface CallPeerInfo {
	id: string;
	name: string;
	photo_url: string | null;
}

interface RingPayload {
	call_id: string;
	match_id: string;
	caller: {
		id: string;
		first_name: string;
		username: string;
		photo_url: string | null;
	} | null;
}

interface SignalPayload {
	call_id: string;
	kind: SignalKind;
	payload: unknown;
	sender_id: string;
}

interface EndPayload {
	call_id: string;
}

export interface CallApi {
	phase: CallPhase;
	matchId: string | null;
	peer: CallPeerInfo | null;
	incoming: boolean;
	muted: boolean;
	seconds: number;
	error: string | null;
	ready: boolean;
	supported: boolean;
	start: (matchId: string, peer: CallPeerInfo) => void;
	accept: () => void;
	decline: () => void;
	hangUp: () => void;
	toggleMute: () => void;
	dismissError: () => void;
}

const IDLE: CallApi = {
	phase: "idle",
	matchId: null,
	peer: null,
	incoming: false,
	muted: false,
	seconds: 0,
	error: null,
	ready: false,
	supported: false,
	start: () => undefined,
	accept: () => undefined,
	decline: () => undefined,
	hangUp: () => undefined,
	toggleMute: () => undefined,
	dismissError: () => undefined,
};

const CallContext = createContext<CallApi>(IDLE);

export function useCall(): CallApi {
	return useContext(CallContext);
}

const SAFETY_MARGIN_MS = 5000;

export function CallProvider({ children }: { children: ReactNode }) {
	const [config, setConfig] = useState<IceConfig | null>(null);
	const [phase, setPhase] = useState<CallPhase>("idle");
	const [peerInfo, setPeerInfo] = useState<CallPeerInfo | null>(null);
	const [matchId, setMatchId] = useState<string | null>(null);
	const [incoming, setIncoming] = useState(false);
	const [muted, setMuted] = useState(false);
	const [seconds, setSeconds] = useState(0);
	const [error, setError] = useState<string | null>(null);
	const supported = useSyncExternalStore(
		() => () => undefined,
		callsSupported,
		() => false,
	);

	const configRef = useRef<IceConfig | null>(null);
	const connection = useRef<Peer | null>(null);
	const callId = useRef<string | null>(null);
	const match = useRef<string | null>(null);
	const offer = useRef<RTCSessionDescriptionInit | null>(null);
	const candidates = useRef<RTCIceCandidateInit[]>([]);
	const awaiting = useRef(false);
	const timeout = useRef<number | null>(null);
	const silence = useRef<(() => void) | null>(null);
	const settled = useRef(false);

	useEffect(() => {
		let live = true;
		void getIceConfig().then((result) => {
			if (live && result.ok) {
				configRef.current = result.data;
				setConfig(result.data);
			}
		});
		return () => {
			live = false;
		};
	}, []);

	const reset = useCallback(() => {
		if (timeout.current !== null) {
			window.clearTimeout(timeout.current);
			timeout.current = null;
		}
		silence.current?.();
		silence.current = null;
		connection.current?.stop();
		connection.current = null;
		callId.current = null;
		match.current = null;
		offer.current = null;
		candidates.current = [];
		awaiting.current = false;
		settled.current = false;
		setPhase("idle");
		setPeerInfo(null);
		setMatchId(null);
		setIncoming(false);
		setMuted(false);
		setSeconds(0);
	}, []);

	const settle = useCallback(
		(status: CallStatus) => {
			const id = callId.current;
			const room = match.current;
			if (id === null || room === null || settled.current) {
				reset();
				return;
			}
			settled.current = true;
			void endCall(room, id, status);
			reset();
		},
		[reset],
	);

	const armTimeout = useCallback(
		(delay: number) => {
			if (timeout.current !== null) {
				window.clearTimeout(timeout.current);
			}
			timeout.current = window.setTimeout(() => {
				settle("missed");
			}, delay);
		},
		[settle],
	);

	const attach = useCallback(
		async (room: string, id: string): Promise<Peer | null> => {
			const servers = configRef.current?.ice_servers ?? [];
			try {
				const peer = await createPeer(servers, {
					onIce: (candidate) => {
						void sendSignal(room, id, "ice", candidate);
					},
					onConnected: () => {
						if (timeout.current !== null) {
							window.clearTimeout(timeout.current);
							timeout.current = null;
						}
						silence.current?.();
						silence.current = null;
						setPhase("active");
					},
					onLost: () => {
						settle("answered");
					},
				});
				if (callId.current !== id) {
					peer.stop();
					return null;
				}
				connection.current = peer;
				return peer;
			} catch (cause) {
				setError(
					cause instanceof InsecureContextError
						? "Les appels exigent une connexion sécurisée. Sur une adresse IP, "
						+ "lancez le serveur avec « npm run dev:https »."
						: cause instanceof MicrophoneError
							? "Micro indisponible. Autorisez l’accès au microphone."
							: "L’appel n’a pas pu démarrer.",
				);
				settle("cancelled");
				return null;
			}
		},
		[settle],
	);

	const start = useCallback(
		(room: string, target: CallPeerInfo) => {
			if (phase !== "idle" || configRef.current === null) {
				return;
			}
			if (!supported) {
				setError(
					"Les appels exigent une connexion sécurisée (HTTPS). "
					+ "Ouvrez le site en https pour appeler.",
				);
				return;
			}
			setPhase("calling");
			setPeerInfo(target);
			setMatchId(room);
			setIncoming(false);
			setError(null);
			match.current = room;

			void openCall(room).then(async (result) => {
				if (!result.ok) {
					setError(
						result.status === 409
							? "Cette personne est déjà en appel."
							: "L’appel n’a pas pu démarrer.",
					);
					reset();
					return;
				}
				callId.current = result.data.call_id;
				armTimeout(result.data.ring_timeout_ms);

				const peer = await attach(room, result.data.call_id);
				if (peer === null) {
					return;
				}
				const description = await peer.offer();
				void sendSignal(room, result.data.call_id, "offer", description);
			});
		},
		[phase, supported, reset, armTimeout, attach],
	);

	const respond = useCallback(
		async (
			peer: Peer,
			room: string,
			id: string,
			description: RTCSessionDescriptionInit,
		) => {
			const reply = await peer.answer(description);
			void sendSignal(room, id, "answer", reply);
			for (const candidate of candidates.current) {
				void peer.addCandidate(candidate);
			}
			candidates.current = [];
		},
		[],
	);

	const accept = useCallback(() => {
		const room = match.current;
		const id = callId.current;
		if (phase !== "ringing" || room === null || id === null) {
			return;
		}
		silence.current?.();
		silence.current = null;
		setPhase("connecting");

		void (async () => {
			const peer = await attach(room, id);
			if (peer === null) {
				return;
			}
			const description = offer.current;
			if (description === null) {
				awaiting.current = true;
				return;
			}
			await respond(peer, room, id, description);
		})();
	}, [phase, attach, respond]);

	const decline = useCallback(() => {
		settle("declined");
	}, [settle]);

	const hangUp = useCallback(() => {
		settle(phase === "active" ? "answered" : "cancelled");
	}, [settle, phase]);

	const toggleMute = useCallback(() => {
		const next = !muted;
		connection.current?.setMuted(next);
		setMuted(next);
	}, [muted]);

	const dismissError = useCallback(() => {
		setError(null);
	}, []);

	useEffect(() => {
		if (config === null) {
			return;
		}
		return subscribe(config.channel, CALL_RING, (raw) => {
			const payload = raw as RingPayload;
			if (match.current !== null || callId.current !== null) {
				return;
			}
			callId.current = payload.call_id;
			match.current = payload.match_id;
			setPhase("ringing");
			setIncoming(true);
			setMatchId(payload.match_id);
			setPeerInfo(
				payload.caller === null
					? null
					: {
						id: payload.caller.id,
						name: payload.caller.first_name || payload.caller.username,
						photo_url: payload.caller.photo_url,
					},
			);
			silence.current = startRingtone();
			armTimeout(config.ring_timeout_ms + SAFETY_MARGIN_MS);
		});
	}, [config, armTimeout]);

	useEffect(() => {
		if (matchId === null || config === null) {
			return;
		}
		return subscribe(chatChannel(matchId), CALL_SIGNAL, (raw) => {
			const payload = raw as SignalPayload;
			if (
				payload.sender_id === config.user_id
				|| payload.call_id !== callId.current
			) {
				return;
			}
			if (payload.kind === "offer") {
				const description = payload.payload as RTCSessionDescriptionInit;
				offer.current = description;
				const peer = connection.current;
				const id = callId.current;
				if (awaiting.current && peer !== null && id !== null) {
					awaiting.current = false;
					void respond(peer, matchId, id, description);
				}
				return;
			}
			if (payload.kind === "answer") {
				setPhase("connecting");
				void connection.current?.accept(
					payload.payload as RTCSessionDescriptionInit,
				);
				return;
			}
			const candidate = payload.payload as RTCIceCandidateInit;
			if (connection.current === null) {
				candidates.current.push(candidate);
				return;
			}
			void connection.current.addCandidate(candidate);
		});
	}, [matchId, config, respond]);

	useEffect(() => {
		if (matchId === null) {
			return;
		}
		return subscribe(chatChannel(matchId), CALL_END, (raw) => {
			if ((raw as EndPayload).call_id !== callId.current) {
				return;
			}
			settled.current = true;
			reset();
		});
	}, [matchId, reset]);

	useEffect(() => {
		if (matchId === null) {
			return;
		}
		return subscribe(chatChannel(matchId), "closed", () => {
			settled.current = true;
			reset();
		});
	}, [matchId, reset]);

	useEffect(() => {
		if (phase !== "active") {
			return;
		}
		const timer = window.setInterval(() => {
			setSeconds((current) => current + 1);
		}, 1000);
		return () => {
			window.clearInterval(timer);
		};
	}, [phase]);

	useEffect(() => {
		return () => {
			connection.current?.stop();
			silence.current?.();
		};
	}, []);

	const value = useMemo<CallApi>(
		() => ({
			phase,
			matchId,
			peer: peerInfo,
			incoming,
			muted,
			seconds,
			error,
			ready: config !== null,
			supported,
			start,
			accept,
			decline,
			hangUp,
			toggleMute,
			dismissError,
		}),
		[
			phase,
			matchId,
			peerInfo,
			incoming,
			muted,
			seconds,
			error,
			config,
			supported,
			start,
			accept,
			decline,
			hangUp,
			toggleMute,
			dismissError,
		],
	);

	return (
		<CallContext.Provider value={value}>{children}</CallContext.Provider>
	);
}
