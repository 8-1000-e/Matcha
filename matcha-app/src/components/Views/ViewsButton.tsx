"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { PresenceAvatar } from "@/components/Presence/PresenceAvatar";
import { fetchViews, type ProfileView } from "@/lib/profile/views";

function when(iso: string) {
	return new Date(iso).toLocaleDateString("fr-FR", {
		day: "numeric",
		month: "short",
		hour: "2-digit",
		minute: "2-digit",
	});
}

export function ViewsButton() {
	const [open, setOpen] = useState(false);
	const [views, setViews] = useState<ProfileView[] | null>(null);
	const [error, setError] = useState<string | null>(null);
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

	useEffect(() => {
		if (!open) {
			return;
		}
		let live = true;
		void fetchViews("received").then((result) => {
			if (!live) {
				return;
			}
			if (result.ok) {
				setViews(result.data.views);
				setError(null);
				return;
			}
			setViews([]);
			setError(result.errors[0]?.message ?? "Chargement impossible.");
		});
		return () => {
			live = false;
		};
	}, [open]);

	return (
		<div ref={container} className="relative">
			<button
				type="button"
				onClick={() => setOpen(!open)}
				aria-expanded={open}
				aria-label="Qui a consulté mon profil"
				className={`flex size-11 cursor-pointer items-center justify-center rounded-xl transition-colors duration-200 ease-out ${
					open ? "bg-leaf/70 text-matcha-dark" : "text-muted hover:bg-leaf/40 hover:text-ink"
				}`}
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
					<path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6-10-6-10-6Z" />
					<circle cx="12" cy="12" r="2.6" />
				</svg>
			</button>

			{open ? (
				<div className="popup absolute top-0 left-full z-20 ml-2 w-72 max-w-[calc(100vw-6rem)] rounded-xl border border-edge/40 bg-cream p-3 shadow-lg">
					<h2 className="text-sm font-semibold">Visites de mon profil</h2>

					{views === null ? (
						<p className="mt-3 text-sm text-muted">Chargement…</p>
					) : error !== null ? (
						<p className="mt-3 text-sm text-muted">{error}</p>
					) : views.length === 0 ? (
						<p className="mt-3 text-sm text-muted">
							Personne n’a encore consulté votre profil.
						</p>
					) : (
						<ul className="mt-3 flex max-h-80 flex-col gap-1 overflow-y-auto">
							{views.map((view) => (
								<li key={`${view.id}-${view.viewed_at}`}>
									<Link
										href={`/users/${view.id}`}
										onClick={() => setOpen(false)}
										className="flex items-center gap-2.5 rounded-lg px-2 py-2 transition-colors duration-200 ease-out hover:bg-leaf/40"
									>
										<PresenceAvatar
											url={view.photo_url}
											name={view.first_name}
											online={view.is_online}
											size="small"
										/>
										<span className="min-w-0 flex-1">
											<span className="block truncate text-sm font-medium">
												{view.first_name}
											</span>
											<span className="block text-xs text-muted">
												{when(view.viewed_at)}
												{view.visit_count !== undefined && view.visit_count > 1
													? ` · ${view.visit_count} visites`
													: ""}
											</span>
										</span>
									</Link>
								</li>
							))}
						</ul>
					)}
				</div>
			) : null}
		</div>
	);
}
