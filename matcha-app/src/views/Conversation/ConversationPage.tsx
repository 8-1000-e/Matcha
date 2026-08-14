"use client";

import Image from "next/image";
import {
	Fragment,
	useCallback,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
	type FormEvent,
} from "react";
import { BackLink } from "@/components/Form/Button";
import { Backdrop } from "@/components/Layout/Backdrop";
import {
	getConversations,
	getMessages,
	markConversationRead,
	postMessage,
	PAGE_SIZE,
	type ChatMessage,
	type Partner,
} from "@/lib/messages/client";
import { dayLabel, lastSeenLabel, messageTime, sameDay } from "@/lib/messages/dates";
import { subscribe } from "@/lib/realtime/client";

function Header({ partner }: { partner: Partner | null }) {
	const name = partner?.first_name ?? partner?.username ?? "Conversation";

	return (
		<header className="mx-auto flex w-full max-w-sm shrink-0 items-center gap-3 px-6 pt-6 pb-3">
			<BackLink href="/messages" />

			<div className="relative size-9 shrink-0 overflow-hidden rounded-full bg-leaf">
				{partner?.photo_url ? (
					<Image
						src={partner.photo_url}
						alt=""
						fill
						unoptimized
						sizes="36px"
						className="object-cover"
					/>
				) : (
					<span className="flex size-full items-center justify-center text-sm font-medium text-matcha-dark">
						{name.slice(0, 1).toUpperCase()}
					</span>
				)}
			</div>

			<div className="min-w-0">
				<p className="truncate font-medium">{name}</p>
				<p className="text-xs text-muted">
					{partner === null
						? ""
						: partner.is_online
							? "en ligne"
							: lastSeenLabel(partner.last_seen_at)}
				</p>
			</div>
		</header>
	);
}

function Bubble({ message, mine }: { message: ChatMessage; mine: boolean }) {
	return (
		<li className={`flex ${mine ? "justify-end" : "justify-start"}`}>
			<div
				className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm whitespace-pre-wrap ${
					mine
						? "bg-matcha text-white"
						: "border border-edge/40 bg-white/70 text-ink"
				}`}
			>
				{message.body}
				<span
					className={`mt-1 block text-right text-xs ${
						mine ? "text-white/70" : "text-muted"
					}`}
				>
					{messageTime(message.sent_at)}
					{mine && message.read ? " · vu" : ""}
				</span>
			</div>
		</li>
	);
}

export function ConversationPage({
	matchId,
	userId,
}: {
	matchId: string;
	userId: string;
}) {
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [partner, setPartner] = useState<Partner | null>(null);
	const [ready, setReady] = useState(false);
	const [missing, setMissing] = useState(false);
	const [older, setOlder] = useState(false);
	const [exhausted, setExhausted] = useState(false);
	const [draft, setDraft] = useState("");
	const [sending, setSending] = useState(false);

	const thread = useRef<HTMLDivElement>(null);
	const sentinel = useRef<HTMLDivElement>(null);
	const kept = useRef<number | null>(null);
	const glued = useRef(true);

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

		void getConversations().then((result) => {
			if (!live || !result.ok) {
				return;
			}
			const found = result.data.matches.find(
				(entry) => entry.match_id === matchId,
			);
			if (found === undefined) {
				setMissing(true);
				return;
			}
			setPartner(found.partner);
		});

		void getMessages(matchId).then((result) => {
			if (!live) {
				return;
			}
			if (!result.ok) {
				setMissing(true);
				return;
			}
			setMessages(result.data.messages);
			setExhausted(result.data.messages.length < PAGE_SIZE);
			setReady(true);
			void markConversationRead(matchId);
		});

		return () => {
			live = false;
		};
	}, [matchId]);

	useEffect(() => {
		return subscribe(`private-chat-${matchId}`, "message", (payload) => {
			add([payload as ChatMessage], false);
			void markConversationRead(matchId);
		});
	}, [matchId, add]);

	useEffect(() => {
		return subscribe(`private-chat-${matchId}`, "read", () => {
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

			<div className="flex h-dvh flex-col">
				<Header partner={partner} />

				<main
					ref={thread}
					onScroll={onScroll}
					className="mx-auto w-full max-w-sm flex-1 overflow-y-auto px-6"
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
										<Bubble
											message={message}
											mine={message.sender_id === userId}
										/>
									</Fragment>
								))}
							</ul>
						</>
					)}
				</main>

				<footer className="mx-auto w-full max-w-sm shrink-0 px-6 pt-2 pb-6">
					<form onSubmit={onSend} className="flex items-end gap-2">
						<input
							type="text"
							value={draft}
							onChange={(event) => setDraft(event.target.value)}
							maxLength={1000}
							disabled={missing}
							placeholder="Votre message"
							aria-label="Votre message"
							className="min-h-12 flex-1 rounded-xl border border-edge bg-white/70 px-4 text-base text-ink placeholder:text-muted focus:border-matcha focus:outline-none disabled:opacity-60"
						/>
						<button
							type="submit"
							disabled={sending || missing || draft.trim().length === 0}
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
		</>
	);
}
