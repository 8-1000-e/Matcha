"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { PrivateScreen } from "@/components/Layout/Screen";
import { getConversations, type Conversation } from "@/lib/messages/client";
import { conversationDate } from "@/lib/messages/dates";
import { subscribe } from "@/lib/realtime/client";

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
	const stamp = conversation.last_message?.sent_at ?? conversation.connected_at;

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
					<span className="text-xs text-muted">{conversationDate(stamp)}</span>
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
	const [conversations, setConversations] = useState<Conversation[] | null>(null);

	useEffect(() => {
		let live = true;

		const load = () => {
			void getConversations().then((result) => {
				if (live && result.ok) {
					setConversations(result.data.matches);
				}
			});
		};

		load();
		const stop = subscribe(`private-user-${userId}`, "notification", load);

		return () => {
			live = false;
			stop();
		};
	}, [userId]);

	const total = conversations?.reduce((sum, entry) => sum + entry.unread, 0) ?? 0;

	return (
		<PrivateScreen
			title="Messages"
			intro={
				total > 0
					? `${total} message${total > 1 ? "s" : ""} non lu${total > 1 ? "s" : ""}.`
					: "Vos connexions apparaissent ici."
			}
			footer={
				<span className="block text-center">
					Vous ne pouvez écrire qu’aux profils qui vous ont liké en retour.
				</span>
			}
		>
			{conversations === null ? (
				<p className="text-sm text-muted">Chargement…</p>
			) : conversations.length === 0 ? (
				<p className="text-sm text-muted">
					Aucune connexion pour l’instant. Likez des profils : dès que
					l’intérêt est réciproque, la conversation s’ouvre ici.
				</p>
			) : (
				<ul className="-mx-2 flex flex-col">
					{conversations.map((conversation) => (
						<Row key={conversation.match_id} conversation={conversation} />
					))}
				</ul>
			)}
		</PrivateScreen>
	);
}
