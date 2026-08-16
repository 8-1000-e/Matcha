"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { MatchaBowl } from "@/components/Brand/Brand";
import { sharedProfile } from "@/lib/profile/client";

function Portrait({ url, className }: { url: string | null; className: string }) {
	return (
		<span className={`relative size-28 overflow-hidden rounded-full bg-leaf/60 ring-4 ring-cream ${className}`}>
			{url === null ? (
				<span className="flex size-full items-center justify-center">
					<MatchaBowl className="size-10 opacity-40" />
				</span>
			) : (
				<Image src={url} alt="" fill unoptimized sizes="112px" className="object-cover" />
			)}
		</span>
	);
}

export function MatchCelebration({
	name,
	photoUrl,
	matchId,
	onClose,
}: {
	name: string;
	photoUrl: string | null;
	matchId: string | null;
	onClose: () => void;
}) {
	const [mine, setMine] = useState<string | null>(null);

	useEffect(() => {
		let live = true;
		void sharedProfile().then((result) => {
			if (!live || !result.ok) {
				return;
			}
			const photo = result.data.profile.photos.find((entry) => entry.is_profile)
				?? result.data.profile.photos[0];
			setMine(photo?.url ?? null);
		});
		return () => {
			live = false;
		};
	}, []);

	useEffect(() => {
		const onKey = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				onClose();
			}
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [onClose]);

	return (
		<div
			role="dialog"
			aria-modal="true"
			aria-label={`Vous avez matché avec ${name}`}
			className="fixed inset-0 z-40 flex items-center justify-center bg-ink/75 p-6 backdrop-blur-sm"
		>
			<div className="motion-safe:animate-[rise-in_320ms_ease-out] flex w-full max-w-sm flex-col items-center gap-6 rounded-3xl bg-cream px-6 py-8 text-center shadow-lg">
				<div className="flex items-center">
					<Portrait url={mine} className="-mr-6 rotate-[-6deg]" />
					<Portrait url={photoUrl} className="-ml-6 rotate-[6deg]" />
				</div>

				<div>
					<h2 className="text-2xl font-semibold tracking-tight text-matcha-dark">
						C’est un match
					</h2>
					<p className="mt-2 text-sm text-muted">
						{name} vous a liké aussi. La conversation est ouverte.
					</p>
				</div>

				<div className="flex w-full flex-col gap-2">
					{matchId !== null ? (
						<Link
							href={`/messages/${matchId}`}
							className="flex min-h-11 items-center justify-center rounded-xl bg-matcha px-5 text-sm font-medium text-white transition-colors duration-200 ease-out hover:bg-matcha-dark"
						>
							Envoyer un message
						</Link>
					) : null}

					<button
						type="button"
						onClick={onClose}
						className="flex min-h-11 cursor-pointer items-center justify-center rounded-xl border border-edge bg-white/70 px-5 text-sm font-medium transition-colors duration-200 ease-out hover:bg-leaf/50"
					>
						Continuer à découvrir
					</button>
				</div>
			</div>
		</div>
	);
}
