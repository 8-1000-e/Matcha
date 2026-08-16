"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
	Fragment,
	useCallback,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
	type Dispatch,
	type FormEvent,
	type SetStateAction,
} from "react";
import { CallBar } from "@/components/Call/CallBar";
import { CallEntry } from "@/components/Call/CallEntry";
import { PhoneIcon } from "@/components/Call/CallIcons";
import { useCall } from "@/components/Call/CallProvider";
import { EventEntry } from "@/components/Event/EventEntry";
import { EventPanel } from "@/components/Event/EventPanel";
import { BackLink } from "@/components/Form/Button";
import { AppNav } from "@/components/Layout/AppNav";
import { Backdrop } from "@/components/Layout/Backdrop";
import { ModerationMenu } from "@/components/Moderation/ModerationMenu";
import { NotificationBell } from "@/components/Notifications/NotificationBell";
import { LocationSync } from "@/components/Presence/LocationSync";
import { PresenceAvatar } from "@/components/Presence/PresenceAvatar";
import { PresenceHeartbeat } from "@/components/Presence/PresenceHeartbeat";
import { getEvents, type AppEvent } from "@/lib/calendar/client";
import {
	getMessages,
	getPartner,
	markConversationRead,
	postMessage,
	PAGE_SIZE,
	type ChatMessage,
	type Partner,
} from "@/lib/messages/client";
import { dayLabel, lastSeenLabel, messageTime, sameDay } from "@/lib/messages/dates";
import { openConversation } from "@/lib/notifications/active";
import { conversationLink } from "@/lib/notifications/notifications";
import { chatChannel } from "@/lib/realtime/channels";
import { subscribe } from "@/lib/realtime/client";
import { usePresence } from "@/lib/realtime/presence";

function Identity({
	partner,
	online,
	gone,
	name,
}: {
	partner: Partner | null;
	online: boolean;
	gone: boolean;
	name: string;
}) {
	const body = (
		<>
			<PresenceAvatar
				url={gone ? null : (partner?.photo_url ?? null)}
				name={name}
				online={online && !gone}
				size="small"
			/>

			<span className="min-w-0 flex-1">
				<span className="block truncate font-medium">{name}</span>
				<span
					className={`block text-xs ${online && !gone ? "text-matcha-dark" : "text-muted"}`}
				>
					{gone
						? "compte supprimé"
						: partner === null
							? ""
							: online
								? "en ligne"
								: lastSeenLabel(partner.last_seen_at)}
				</span>
			</span>
		</>
	);

	if (partner === null || gone) {
		return <div className="flex min-w-0 flex-1 items-center gap-3">{body}</div>;
	}

	return (
		<Link
			href={`/users/${partner.id}`}
			aria-label={`Voir le profil de ${name}`}
			className="flex min-w-0 flex-1 items-center gap-3 rounded-lg px-1 py-0.5 transition-colors duration-200 ease-out hover:bg-leaf/40"
		>
			{body}
		</Link>
	);
}

function Header({
	partner,
	online,
	gone,
	matchId,
	userId,
	onBlocked,
	events,
}: {
	partner: Partner | null;
	online: boolean;
	gone: boolean;
	matchId: string;
	userId: string;
	onBlocked: () => void;
	events: EventState;
}) {
	const name = gone
		? "Utilisateur supprimé"
		: (partner?.first_name ?? partner?.username ?? "Conversation");

	return (
		<header className="mx-auto flex w-full max-w-md shrink-0 items-center gap-2 px-4 pt-4 pb-3 sm:gap-3 sm:px-6 sm:pt-6">
			<BackLink href="/messages" compact />

			<Identity partner={partner} online={online} gone={gone} name={name} />

			<EventPanel
				matchId={matchId}
				userId={userId}
				disabled={partner === null || gone}
				ready={events.ready}
				open={events.open}
				setOpen={events.setOpen}
				events={events.list}
				setEvents={events.setList}
			/>

			<CallButton partner={partner} gone={gone} matchId={matchId} />

			<NotificationBell />

			{partner === null || gone ? null : (
				<ModerationMenu
					userId={partner.id}
					name={name}
					onBlocked={onBlocked}
				/>
			)}
		</header>
	);
}

interface EventState {
	ready: boolean;
	open: boolean;
	setOpen: (open: boolean) => void;
	list: AppEvent[];
	setList: Dispatch<SetStateAction<AppEvent[]>>;
}

const LIVENESS_MS = 60_000;

function Ticks({ read }: { read: boolean }) {
	return (
		<>
			<svg
				viewBox="0 0 22 12"
				aria-hidden="true"
				className={`ml-1 inline-block h-3 w-4 align-[-2px] ${
					read ? "text-white" : "text-white/60"
				}`}
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
			>
				<path d="M1 6.5 4.5 10 11 2.5" />
				{read ? <path d="M8 6.5 11.5 10 18 2.5" /> : null}
			</svg>
			<span className="sr-only">{read ? "vu" : "envoyé"}</span>
		</>
	);
}

function CallButton({
	partner,
	gone,
	matchId,
}: {
	partner: Partner | null;
	gone: boolean;
	matchId: string;
}) {
	const call = useCall();

	if (partner === null || gone || !call.ready) {
		return null;
	}

	const name = partner.first_name || partner.username;

	return (
		<button
			type="button"
			disabled={call.phase !== "idle"}
			onClick={() => {
				call.start(matchId, {
					id: partner.id,
					name,
					photo_url: partner.photo_url,
				});
			}}
			aria-label={`Appeler ${name}`}
			className="inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-matcha-dark transition-colors duration-200 ease-out hover:bg-leaf/40 disabled:cursor-not-allowed disabled:opacity-40"
		>
			<PhoneIcon className="size-5" />
		</button>
	);
}

function Bubble({ message, mine }: { message: ChatMessage; mine: boolean }) {
	return (
		<li className={`flex min-w-0 ${mine ? "justify-end" : "justify-start"}`}>
			<div
				className={`max-w-[80%] min-w-0 rounded-2xl px-3.5 py-2 text-sm break-words whitespace-pre-wrap ${
					mine
						? "bg-matcha text-white"
						: "border border-edge/40 bg-white/70 text-ink"
				}`}
			>
				{message.body}
				<span
					className={`relative mt-1 block text-right text-xs ${
						mine ? "text-white/70" : "text-muted"
					}`}
				>
					{messageTime(message.sent_at)}
					{mine ? <Ticks read={message.read} /> : null}
				</span>
			</div>
		</li>
	);
}

export function ThreadPage({
	matchId,
	userId,
}: {
	matchId: string;
	userId: string;
}) {
	const router = useRouter();
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [partner, setPartner] = useState<Partner | null>(null);
	const [ready, setReady] = useState(false);
	const [missing, setMissing] = useState(false);
	const [gone, setGone] = useState(false);
	const [older, setOlder] = useState(false);
	const [exhausted, setExhausted] = useState(false);
	const [draft, setDraft] = useState("");
	const [sending, setSending] = useState(false);
	const [eventList, setEventList] = useState<AppEvent[]>([]);
	const [eventsReady, setEventsReady] = useState(false);
	const [eventsOpen, setEventsOpen] = useState(false);

	const thread = useRef<HTMLDivElement>(null);
	const sentinel = useRef<HTMLDivElement>(null);
	const kept = useRef<number | null>(null);
	const glued = useRef(true);
	const unseen = useRef(false);

	const flushRead = useCallback(() => {
		if (!unseen.current || document.visibilityState !== "visible") {
			return;
		}
		unseen.current = false;
		void markConversationRead(matchId);
	}, [matchId]);

	useEffect(() => {
		void markConversationRead(matchId);
	}, [matchId]);

	const loadEvents = useCallback(() => {
		void getEvents(matchId).then((result) => {
			setEventsReady(true);
			if (result.ok) {
				setEventList(result.data.events);
			}
		});
	}, [matchId]);

	useEffect(() => {
		loadEvents();
	}, [loadEvents]);

	const events: EventState = {
		ready: eventsReady,
		open: eventsOpen,
		setOpen: setEventsOpen,
		list: eventList,
		setList: setEventList,
	};

	const add = useCallback((incoming: ChatMessage[], atTop: boolean) => {
		setMessages((current) => {
			const known = new Set(current.map((entry) => entry.id));
			const fresh = incoming.filter((entry) => !known.has(entry.id));
			if (fresh.length === 0) {
				return current;
			}
			return atTop ? [...fresh, ...current] : [...current, ...fresh];
		});
	}, []);

	useEffect(() => {
		let live = true;

		void getMessages(matchId).then((result) => {
			if (!live) {
				return;
			}
			if (!result.ok) {
				setMissing(true);
				return;
			}
			setPartner(result.data.partner);
			setGone(result.data.partner_deleted);
			setMessages(result.data.messages);
			setExhausted(result.data.messages.length < PAGE_SIZE);
			setReady(true);
			unseen.current = result.data.messages.some(
				(entry) => entry.sender_id !== userId && !entry.read,
			);
			flushRead();
		});

		return () => {
			live = false;
		};
	}, [matchId, userId, flushRead]);

	const partnerId = partner?.id ?? null;
	const presence = usePresence(partnerId, () => {
		setMissing(true);
	});
	const online = presence ?? partner?.is_online ?? false;

	useEffect(() => {
		if (missing) {
			return;
		}
		const timer = window.setInterval(() => {
			if (document.visibilityState !== "visible") {
				return;
			}
			void getPartner(matchId).then((result) => {
				if (result.ok) {
					setPartner(result.data.partner);
					return;
				}
				if (result.status === 404) {
					setMissing(true);
				}
			});
		}, LIVENESS_MS);
		return () => {
			window.clearInterval(timer);
		};
	}, [matchId, missing]);

	useEffect(() => {
		return openConversation(conversationLink(matchId));
	}, [matchId]);

	useEffect(() => {
		return subscribe(chatChannel(matchId), "closed", () => {
			setMissing(true);
		});
	}, [matchId]);

	useEffect(() => {
		document.addEventListener("visibilitychange", flushRead);
		return () => {
			document.removeEventListener("visibilitychange", flushRead);
		};
	}, [flushRead]);

	useEffect(() => {
		return subscribe(chatChannel(matchId), "message", (payload) => {
			const incoming = payload as ChatMessage;
			add([incoming], false);
			if (incoming.kind === "event") {
				loadEvents();
			}
			if (incoming.sender_id !== userId) {
				unseen.current = true;
				flushRead();
			}
		});
	}, [matchId, userId, add, flushRead, loadEvents]);

	useEffect(() => {
		return subscribe(chatChannel(matchId), "read", () => {
			setMessages((current) =>
				current.map((entry) =>
					entry.sender_id === userId ? { ...entry, read: true } : entry,
				),
			);
		});
	}, [matchId, userId]);

	const loadOlder = useCallback(() => {
		const first = messages[0];
		if (older || exhausted || first === undefined) {
			return;
		}
		setOlder(true);
		kept.current = thread.current?.scrollHeight ?? null;
		void getMessages(matchId, first.sent_at).then((result) => {
			setOlder(false);
			if (!result.ok) {
				return;
			}
			if (result.data.messages.length < PAGE_SIZE) {
				setExhausted(true);
			}
			add(result.data.messages, true);
		});
	}, [messages, older, exhausted, matchId, add]);

	useEffect(() => {
		const mark = sentinel.current;
		if (mark === null || !ready || exhausted) {
			return;
		}
		const watcher = new IntersectionObserver(
			(entries) => {
				if (entries.some((entry) => entry.isIntersecting)) {
					loadOlder();
				}
			},
			{ root: thread.current, rootMargin: "120px" },
		);
		watcher.observe(mark);
		return () => {
			watcher.disconnect();
		};
	}, [ready, exhausted, loadOlder]);

	useLayoutEffect(() => {
		const box = thread.current;
		if (box === null) {
			return;
		}
		if (kept.current !== null) {
			box.scrollTop += box.scrollHeight - kept.current;
			kept.current = null;
			return;
		}
		if (glued.current) {
			box.scrollTop = box.scrollHeight;
		}
	}, [messages]);

	function onScroll() {
		const box = thread.current;
		if (box === null) {
			return;
		}
		glued.current = box.scrollHeight - box.scrollTop - box.clientHeight < 80;
	}

	function onSend(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const body = draft.trim();
		if (body.length === 0 || sending) {
			return;
		}
		setSending(true);
		void postMessage(matchId, body).then((result) => {
			setSending(false);
			if (!result.ok) {
				return;
			}
			setDraft("");
			glued.current = true;
			add([result.data.message], false);
		});
	}

	return (
		<>
			<Backdrop />
			<PresenceHeartbeat />
			<LocationSync />

			<div className="flex h-dvh flex-col overflow-hidden sm:flex-row">
				<AppNav />

				<div className="flex min-h-0 min-w-0 flex-1 flex-col">
					<Header
						partner={partner}
						online={online}
						gone={gone}
						matchId={matchId}
						userId={userId}
						events={events}
						onBlocked={() => {
							router.replace("/messages");
						}}
					/>

					<CallBar matchId={matchId} />

					<main
						ref={thread}
						onScroll={onScroll}
						className="mx-auto w-full max-w-md flex-1 overflow-y-auto overscroll-contain px-4 sm:px-6"
					>
						{missing ? (
							<p className="py-8 text-sm text-muted">
							Cette conversation n’est plus disponible. Vous n’êtes plus
							connectés, ou l’un de vous a bloqué l’autre.
							</p>
						) : (
							<>
								<div ref={sentinel} aria-hidden="true" className="h-px" />

								{older ? (
									<p className="py-2 text-center text-xs text-muted">
									Chargement…
									</p>
								) : null}

								{exhausted && messages.length > 0 ? (
									<p className="py-3 text-center text-xs text-muted">
									Début de la conversation.
									</p>
								) : null}

								{ready && messages.length === 0 ? (
									<p className="py-8 text-sm text-muted">
									Aucun message. Lancez la conversation.
									</p>
								) : null}

								<ul className="flex flex-col gap-2 pb-4">
									{messages.map((message, index) => (
										<Fragment key={message.id}>
											{index === 0
										|| !sameDay(messages[index - 1].sent_at, message.sent_at) ? (
													<li className="py-2 text-center text-xs text-muted">
														{dayLabel(message.sent_at)}
													</li>
												) : null}
											{message.kind === "event" ? (
												<EventEntry
													event={eventList.find(
														(entry) => entry.id === message.event_id,
													)}
													mine={message.sender_id === userId}
													sentAt={message.sent_at}
													onOpen={() => {
														setEventsOpen(true);
													}}
												/>
											) : message.kind === "call" ? (
												<CallEntry
													message={message}
													mine={message.sender_id === userId}
												/>
											) : (
												<Bubble
													message={message}
													mine={message.sender_id === userId}
												/>
											)}
										</Fragment>
									))}
								</ul>
							</>
						)}
					</main>

					<footer className="mx-auto w-full max-w-md shrink-0 px-4 pt-2 pb-4 sm:px-6 sm:pb-6">
						<form onSubmit={onSend} className="flex items-end gap-2">
							<input
								type="text"
								value={draft}
								onChange={(event) => setDraft(event.target.value)}
								maxLength={1000}
								disabled={missing || gone}
								placeholder={gone ? "Ce compte a été supprimé" : "Votre message"}
								aria-label="Votre message"
								className="min-h-12 flex-1 rounded-xl border border-edge bg-white/70 px-4 text-base text-ink placeholder:text-muted focus:border-matcha focus:outline-none disabled:opacity-60"
							/>
							<button
								type="submit"
								disabled={sending || missing || gone || draft.trim().length === 0}
								aria-label="Envoyer"
								className="inline-flex size-12 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-matcha text-white transition-colors duration-200 ease-out hover:bg-matcha-dark disabled:cursor-not-allowed disabled:opacity-60"
							>
								<svg
									viewBox="0 0 20 20"
									aria-hidden="true"
									className="size-5"
									fill="none"
									stroke="currentColor"
									strokeWidth="1.8"
									strokeLinecap="round"
									strokeLinejoin="round"
								>
									<path d="M3 10.5 17 3l-4.5 14-2.5-6z" />
								</svg>
							</button>
						</form>
					</footer>
				</div>
			</div>
		</>
	);
}
