"use client";

import { useEffect, useRef, useState } from "react";
import type { ReportReason } from "@/lib/db/types";
import {
	blockUser,
	REPORT_CHOICES,
	REPORT_LABELS,
	reportUser,
} from "@/lib/moderation/client";

type Panel = "menu" | "report" | "block";

const ITEM
	= "block w-full cursor-pointer rounded-lg px-2 py-2 text-left text-sm transition-colors duration-200 ease-out hover:bg-leaf/40";

export function ModerationMenu({
	userId,
	name,
	onBlocked,
}: {
	userId: string;
	name: string;
	onBlocked: () => void;
}) {
	const [open, setOpen] = useState(false);
	const [panel, setPanel] = useState<Panel>("menu");
	const [reason, setReason] = useState<ReportReason>(REPORT_CHOICES[0]);
	const [busy, setBusy] = useState(false);
	const [done, setDone] = useState<string | null>(null);
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

	function toggle() {
		setOpen((current) => !current);
		setPanel("menu");
		setDone(null);
	}

	function confirmBlock() {
		setBusy(true);
		void blockUser(userId).then((result) => {
			setBusy(false);
			if (!result.ok) {
				setDone("Le blocage a échoué.");
				return;
			}
			setOpen(false);
			onBlocked();
		});
	}

	function confirmReport() {
		setBusy(true);
		void reportUser(userId, reason).then((result) => {
			setBusy(false);
			setPanel("menu");
			setDone(
				result.ok
					? "Signalement envoyé."
					: (result.errors[0]?.message ?? "Le signalement a échoué."),
			);
		});
	}

	return (
		<div ref={container} className="relative">
			<button
				type="button"
				onClick={toggle}
				aria-label={`Options pour ${name}`}
				aria-expanded={open}
				className="inline-flex size-10 cursor-pointer items-center justify-center rounded-lg text-muted transition-colors duration-200 ease-out hover:bg-leaf/50 hover:text-ink"
			>
				<svg
					viewBox="0 0 24 24"
					aria-hidden="true"
					className="size-5"
					fill="currentColor"
				>
					<circle cx="12" cy="5" r="1.7" />
					<circle cx="12" cy="12" r="1.7" />
					<circle cx="12" cy="19" r="1.7" />
				</svg>
			</button>

			{open ? (
				<div className="popup absolute right-0 z-10 mt-2 w-64 max-w-[calc(100vw-3rem)] rounded-xl border border-edge/40 bg-cream p-3 shadow-lg">
					{panel === "menu" ? (
						<>
							<button
								type="button"
								className={`${ITEM} font-medium text-red-700 hover:bg-red-50`}
								onClick={() => setPanel("report")}
							>
								Signaler {name}
							</button>
							<button
								type="button"
								className={`${ITEM} font-medium text-red-700 hover:bg-red-50`}
								onClick={() => setPanel("block")}
							>
								Bloquer {name}
							</button>
							{done === null ? null : (
								<p className="mt-2 px-2 text-xs text-muted">{done}</p>
							)}
						</>
					) : null}

					{panel === "report" ? (
						<>
							<p className="px-2 text-sm font-medium">Motif du signalement</p>
							<label className="mt-2 block px-2">
								<span className="sr-only">Motif</span>
								<select
									value={reason}
									onChange={(event) =>
										setReason(event.target.value as ReportReason)
									}
									className="min-h-10 w-full rounded-lg border border-edge bg-white/70 px-2 text-sm text-ink focus:border-matcha focus:outline-none"
								>
									{REPORT_CHOICES.map((choice) => (
										<option key={choice} value={choice}>
											{REPORT_LABELS[choice]}
										</option>
									))}
								</select>
							</label>
							<div className="mt-3 flex gap-2 px-2">
								<button
									type="button"
									disabled={busy}
									onClick={confirmReport}
									className="min-h-10 flex-1 cursor-pointer rounded-lg bg-matcha px-3 text-sm font-medium text-white transition-colors duration-200 ease-out hover:bg-matcha-dark disabled:opacity-60"
								>
									Envoyer
								</button>
								<button
									type="button"
									disabled={busy}
									onClick={() => setPanel("menu")}
									className="min-h-10 cursor-pointer rounded-lg px-3 text-sm text-muted hover:text-ink"
								>
									Annuler
								</button>
							</div>
						</>
					) : null}

					{panel === "block" ? (
						<>
							<p className="px-2 text-sm font-medium">Bloquer {name} ?</p>
							<p className="mt-1 px-2 text-xs text-muted">
								Votre connexion et vos likes seront supprimés, et la
								conversation fermée des deux côtés.
							</p>
							<div className="mt-3 flex gap-2 px-2">
								<button
									type="button"
									disabled={busy}
									onClick={confirmBlock}
									className="min-h-10 flex-1 cursor-pointer rounded-lg bg-ink px-3 text-sm font-medium text-cream transition-colors duration-200 ease-out hover:opacity-90 disabled:opacity-60"
								>
									Bloquer
								</button>
								<button
									type="button"
									disabled={busy}
									onClick={() => setPanel("menu")}
									className="min-h-10 cursor-pointer rounded-lg px-3 text-sm text-muted hover:text-ink"
								>
									Annuler
								</button>
							</div>
						</>
					) : null}
				</div>
			) : null}
		</div>
	);
}
