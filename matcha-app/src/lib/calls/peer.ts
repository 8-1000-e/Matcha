"use client";

export interface PeerHandlers {
	onIce: (candidate: RTCIceCandidateInit) => void;
	onConnected: () => void;
	onLost: () => void;
}

export interface Peer {
	offer: () => Promise<RTCSessionDescriptionInit>;
	answer: (
		offer: RTCSessionDescriptionInit,
	) => Promise<RTCSessionDescriptionInit>;
	accept: (answer: RTCSessionDescriptionInit) => Promise<void>;
	addCandidate: (candidate: RTCIceCandidateInit) => Promise<void>;
	setMuted: (muted: boolean) => void;
	stop: () => void;
}

export class MicrophoneError extends Error {}

export class InsecureContextError extends Error {}

export function callsSupported(): boolean {
	return (
		typeof window !== "undefined"
		&& window.isSecureContext
		&& navigator.mediaDevices !== undefined
	);
}

async function microphone(): Promise<MediaStream> {
	if (typeof window !== "undefined" && !window.isSecureContext) {
		throw new InsecureContextError("insecure_context");
	}
	if (
		typeof navigator === "undefined"
		|| navigator.mediaDevices === undefined
	) {
		throw new MicrophoneError("microphone_unavailable");
	}
	try {
		return await navigator.mediaDevices.getUserMedia({
			audio: {
				echoCancellation: true,
				noiseSuppression: true,
				autoGainControl: true,
			},
		});
	} catch {
		throw new MicrophoneError("microphone_denied");
	}
}

export async function createPeer(
	iceServers: RTCIceServer[],
	handlers: PeerHandlers,
): Promise<Peer> {
	const local = await microphone();
	const connection = new RTCPeerConnection({ iceServers });

	for (const track of local.getTracks()) {
		connection.addTrack(track, local);
	}

	const speaker = document.createElement("audio");
	speaker.autoplay = true;
	speaker.hidden = true;
	document.body.append(speaker);

	const pending: RTCIceCandidateInit[] = [];
	let stopped = false;

	connection.addEventListener("track", (event) => {
		speaker.srcObject = event.streams[0] ?? null;
		void speaker.play().catch(() => undefined);
	});

	connection.addEventListener("icecandidate", (event) => {
		if (event.candidate !== null) {
			handlers.onIce(event.candidate.toJSON());
		}
	});

	connection.addEventListener("connectionstatechange", () => {
		if (stopped) {
			return;
		}
		if (connection.connectionState === "connected") {
			handlers.onConnected();
			return;
		}
		if (
			connection.connectionState === "failed"
			|| connection.connectionState === "closed"
		) {
			handlers.onLost();
		}
	});

	async function drain(): Promise<void> {
		while (pending.length > 0) {
			const candidate = pending.shift();
			if (candidate !== undefined) {
				await connection.addIceCandidate(candidate).catch(() => undefined);
			}
		}
	}

	return {
		offer: async () => {
			const description = await connection.createOffer();
			await connection.setLocalDescription(description);
			return description;
		},
		answer: async (offer) => {
			await connection.setRemoteDescription(offer);
			await drain();
			const description = await connection.createAnswer();
			await connection.setLocalDescription(description);
			return description;
		},
		accept: async (answer) => {
			if (connection.signalingState === "stable") {
				return;
			}
			await connection.setRemoteDescription(answer);
			await drain();
		},
		addCandidate: async (candidate) => {
			if (connection.remoteDescription === null) {
				pending.push(candidate);
				return;
			}
			await connection.addIceCandidate(candidate).catch(() => undefined);
		},
		setMuted: (muted) => {
			for (const track of local.getAudioTracks()) {
				track.enabled = !muted;
			}
		},
		stop: () => {
			if (stopped) {
				return;
			}
			stopped = true;
			for (const track of local.getTracks()) {
				track.stop();
			}
			connection.close();
			speaker.srcObject = null;
			speaker.remove();
		},
	};
}
