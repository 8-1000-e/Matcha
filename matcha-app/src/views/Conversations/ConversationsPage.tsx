"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { PrivateScreen } from "@/components/Layout/Screen";
import {
	CONVERSATION_PAGE_SIZE,
	getConversations,
	type Conversation,
	type ConversationCursor,
} from "@/lib/messages/client";
import { conversationDate } from "@/lib/messages/dates";
import { subscribe } from "@/lib/realtime/client";

const SEARCH_DELAY_MS = 300;
const REFRESH_MS = 30_000;

interface Page {
	query: string;
	items: Conversation[];
}

function merge(
	current: Conversation[],
	fresh: Conversation[],
): Conversation[] {
	const byId = new Map(current.map((entry) => [entry.match_id, entry]));
	for (const entry of fresh) {
		byId.set(entry.match_id, entry);
	}
	return [...byId.values()].sort((left, right) =>
		left.activity_at === right.activity_at
			? right.match_id.localeCompare(left.match_id)
			: right.activity_at.localeCompare(left.activity_at),
	);
}

function Avatar({
	url,
	online,
	name,
}: {
	url: string | null;
	online: boolean;
	name: string;
}) {
	return (
		<div className="relative size-12 shrink-0">
			<div className="relative size-12 overflow-hidden rounded-full bg-leaf">
				{url === null ? (
					<span className="flex size-full items-center justify-center text-base font-medium text-matcha-dark">
						{name.slice(0, 1).toUpperCase()}
					</span>
				) : (
					<Image src={url} alt="" fill unoptimized sizes="48px" className="object-cover" />
				)}
			</div>
			{online ? (
				<span
					className="absolute right-0 bottom-0 size-3 rounded-full bg-matcha ring-2 ring-cream"
					aria-label="en ligne"
				/>
			) : null}
		</div>
	);
}

function Preview({ conversation }: { conversation: Conversation }) {
	const unread = conversation.unread > 0;
	const last = conversation.last_message;

	if (last === null) {
		return (
			<span className="block truncate text-sm text-muted italic">
				Dites-vous bonjour.
			</span>
		);
	}

	return (
		<span
			className={`block truncate text-sm ${
				unread ? "font-semibold text-ink" : "text-muted"
			}`}
		>
			{last.mine ? "Vous : " : ""}
			{last.body}
		</span>
	);
}

function Row({ conversation }: { conversation: Conversation }) {
	const partner = conversation.partner;
	const unread = conversation.unread > 0;
	const name = partner?.first_name ?? partner?.username ?? "Profil supprimé";

	return (
		<li>
			<Link
				href={`/messages/${conversation.match_id}`}
				className="flex items-center gap-3 rounded-xl px-2 py-3 transition-colors duration-200 ease-out hover:bg-leaf/40"
			>
				<Avatar
					url={partner?.photo_url ?? null}
					online={partner?.is_online ?? false}
					name={name}
				/>

				<span className="min-w-0 flex-1">
					<span
						className={`block truncate ${
							unread ? "font-semibold text-ink" : "font-medium"
						}`}
					>
						{name}
					</span>
					<Preview conversation={conversation} />
				</span>

				<span className="flex shrink-0 flex-col items-end gap-1.5">
					<span className="text-xs text-muted">
						{conversationDate(conversation.activity_at)}
					</span>
					{unread ? (
						<span
							className="size-2.5 rounded-full bg-matcha"
							aria-label={`${conversation.unread} message${
								conversation.unread > 1 ? "s" : ""
							} non lu${conversation.unread > 1 ? "s" : ""}`}
						/>
					) : null}
				</span>
			</Link>
		</li>
	);
}

export function ConversationsPage({ userId }: { userId: string }) {
	const [page, setPage] = useState<Page | null>(null);
	const [search, setSearch] = useState("");
	const [applied, setApplied] = useState("");
	const [unreadTotal, setUnreadTotal] = useState(0);
	const [exhausted, setExhausted] = useState(false);
	const [more, setMore] = useState(false);

	const sentinel = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const timer = window.setTimeout(() => {
			setApplied(search.trim());
		}, SEARCH_DELAY_MS);
		return () => {
			window.clearTimeout(timer);
		};
	}, [search]);

	const load = useCallback(() => {
		void getConversations({ search: applied }).then((result) => {
			if (!result.ok) {
				return;
			}
			setUnreadTotal(result.data.unread_messages);
			setExhausted(result.data.matches.length < CONVERSATION_PAGE_SIZE);
			setPage({ query: applied, items: result.data.matches });
		});
	}, [applied]);

	const refresh = useCallback(() => {
		void getConversations({ search: applied }).then((result) => {
			if (!result.ok) {
				return;
			}
			setUnreadTotal(result.data.unread_messages);
			setPage((current) =>
				current === null || current.query !== applied
					? { query: applied, items: result.data.matches }
					: { query: applied, items: merge(current.items, result.data.matches) },
			);
		});
	}, [applied]);

	useEffect(() => {
		load();
	}, [load]);

	useEffect(() => {
		return subscribe(`private-user-${userId}`, "notification", refresh);
	}, [userId, refresh]);

	useEffect(() => {
		const timer = window.setInterval(() => {
			if (document.visibilityState === "visible") {
				refresh();
			}
		}, REFRESH_MS);
		return () => {
			window.clearInterval(timer);
		};
	}, [refresh]);

	const loading = page === null || page.query !== applied;
	const conversations = loading ? null : page.items;

	const loadMore = useCallback(() => {
		if (more || exhausted || page === null || page.query !== applied) {
			return;
		}
		const tail = page.items[page.items.length - 1];
		if (tail === undefined) {
			return;
		}
		const cursor: ConversationCursor = {
			activity_at: tail.activity_at,
			id: tail.match_id,
		};
		setMore(true);
		void getConversations({ search: applied, before: cursor }).then((result) => {
			setMore(false);
			if (!result.ok) {
				return;
			}
			if (result.data.matches.length < CONVERSATION_PAGE_SIZE) {
				setExhausted(true);
			}
			setPage((current) => {
				if (current === null || current.query !== applied) {
					return current;
				}
				return {
					query: current.query,
					items: merge(current.items, result.data.matches),
				};
			});
		});
	}, [more, exhausted, page, applied]);

	useEffect(() => {
		const mark = sentinel.current;
		if (mark === null || conversations === null || exhausted) {
			return;
		}
		const watcher = new IntersectionObserver(
			(entries) => {
				if (entries.some((entry) => entry.isIntersecting)) {
					loadMore();
				}
			},
			{ rootMargin: "200px" },
		);
		watcher.observe(mark);
		return () => {
			watcher.disconnect();
		};
	}, [conversations, exhausted, loadMore]);

	return (
		<PrivateScreen
			title="Messages"
			intro={
				unreadTotal > 0
					? `${unreadTotal} message${unreadTotal > 1 ? "s" : ""} non lu${
						unreadTotal > 1 ? "s" : ""
					}.`
					: undefined
			}
			footer={null}
		>
			<label className="block">
				<span className="sr-only">Rechercher une conversation</span>
				<input
					type="search"
					value={search}
					onChange={(event) => setSearch(event.target.value)}
					maxLength={32}
					placeholder="Rechercher"
					className="min-h-11 w-full rounded-xl border border-edge bg-white/70 px-4 text-base text-ink placeholder:text-muted focus:border-matcha focus:outline-none"
				/>
			</label>

			{conversations === null ? (
				<p className="mt-6 text-sm text-muted">Chargement…</p>
			) : conversations.length === 0 ? (
				<p className="mt-6 text-sm text-muted">
					{applied.length > 0
						? `Aucune conversation ne correspond à « ${applied} ».`
						: "Aucune connexion pour l’instant. Likez des profils : dès que l’intérêt est réciproque, la conversation s’ouvre ici."}
				</p>
			) : (
				<>
					<ul className="-mx-2 mt-4 flex flex-col">
						{conversations.map((conversation) => (
							<Row key={conversation.match_id} conversation={conversation} />
						))}
					</ul>

					<div ref={sentinel} aria-hidden="true" className="h-px" />

					{more ? (
						<p className="py-3 text-center text-xs text-muted">Chargement…</p>
					) : null}
				</>
			)}
		</PrivateScreen>
	);
}
