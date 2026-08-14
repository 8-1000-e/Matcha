"use client";

import { useEffect, useRef, useState } from "react";
import { useNotifications } from "@/lib/notifications/client";
import {
	NOTIFICATION_LABELS,
	UNKNOWN_ACTOR,
	type NotificationPayload,
} from "@/lib/notifications/notifications";

function label(entry: NotificationPayload): string {
	return NOTIFICATION_LABELS[entry.type](entry.actor_username ?? UNKNOWN_ACTOR);
}

function when(iso: string): string {
	return new Date(iso).toLocaleDateString("fr-FR", {
		day: "numeric",
		month: "short",
		hour: "2-digit",
		minute: "2-digit",
	});
}

function badge(count: number): string {
	return count > 9 ? "9+" : String(count);
}

export function NotificationBell() {
	const { notifications, unread, unreadMessages, markAll, markOne }
		= useNotifications();
	const [open, setOpen] = useState(false);
	const container = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!open) {
			return;
		}
		const onKey = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				setOpen(false);
			}
		};
		const onClick = (event: MouseEvent) => {
			if (
				container.current !== null
				&& event.target instanceof Node
				&& !container.current.contains(event.target)
			) {
				setOpen(false);
			}
		};
		window.addEventListener("keydown", onKey);
		window.addEventListener("mousedown", onClick);
		return () => {
			window.removeEventListener("keydown", onKey);
			window.removeEventListener("mousedown", onClick);
		};
	}, [open]);

	return (
		<div ref={container} className="relative">
			<button
				type="button"
				onClick={() => setOpen((current) => !current)}
				aria-label={
					unread === 0 ? "Notifications" : `Notifications, ${unread} non lues`
				}
				aria-expanded={open}
				className="relative inline-flex size-11 cursor-pointer items-center justify-center rounded-lg text-ink transition-colors duration-200 ease-out hover:bg-leaf/50"
			>
				<svg
					viewBox="0 0 24 24"
					aria-hidden="true"
					className="size-5"
					fill="none"
					stroke="currentColor"
					strokeWidth="1.8"
					strokeLinecap="round"
					strokeLinejoin="round"
				>
					<path d="M18 8a6 6 0 1 0-12 0c0 6-2 7-2 7h16s-2-1-2-7" />
					<path d="M10.3 20a2 2 0 0 0 3.4 0" />
				</svg>
				{unread > 0 ? (
					<span className="absolute top-0.5 right-0.5 min-w-5 rounded-full bg-matcha px-1 text-center text-xs font-semibold text-white">
						{badge(unread)}
					</span>
				) : null}
			</button>

			{open ? (
				<div className="popup absolute right-0 z-10 mt-2 w-72 max-w-[calc(100vw-3rem)] rounded-xl border border-edge/40 bg-cream p-3 shadow-lg">
					<div className="flex items-baseline justify-between gap-3">
						<h2 className="text-sm font-semibold">Notifications</h2>
						{unread > 0 ? (
							<button
								type="button"
								onClick={markAll}
								className="cursor-pointer text-xs text-muted underline decoration-matcha/40 underline-offset-4 hover:decoration-matcha"
							>
								Tout marquer comme lu
							</button>
						) : null}
					</div>

					{unreadMessages > 0 ? (
						<p className="mt-2 rounded-lg bg-leaf/50 px-2 py-1.5 text-xs font-medium">
							{unreadMessages === 1
								? "1 nouveau message non lu"
								: `${unreadMessages} nouveaux messages non lus`}
						</p>
					) : null}

					{notifications.length === 0 ? (
						<p className="mt-3 text-sm text-muted">Rien pour le moment.</p>
					) : (
						<ul className="mt-3 flex max-h-80 flex-col gap-1 overflow-y-auto">
							{notifications.map((entry) => (
								<li key={entry.id}>
									<button
										type="button"
										onClick={() => markOne(entry.id)}
										disabled={entry.read}
										className={`w-full cursor-pointer rounded-lg px-2 py-2 text-left text-sm transition-colors duration-200 ease-out hover:bg-leaf/40 disabled:cursor-default disabled:hover:bg-transparent ${
											entry.read ? "text-muted" : "font-medium"
										}`}
									>
										{label(entry)}
										<span className="mt-0.5 block text-xs text-muted">
											{when(entry.created_at)}
										</span>
									</button>
								</li>
							))}
						</ul>
					)}
				</div>
			) : null}
		</div>
	);
}
