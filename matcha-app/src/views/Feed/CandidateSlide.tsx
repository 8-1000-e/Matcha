"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { MatchaBowl } from "@/components/Brand/Brand";
import type { Candidate } from "@/lib/discovery/client";

const GENDERS: Record<string, string> = {
	woman: "Femme",
	man: "Homme",
	non_binary: "Non-binaire",
	other: "Autre",
};

function distance(km: number | null) {
	if (km === null) {
		return "Localisation inconnue";
	}
	return km < 1 ? "à moins d’1 km" : `à ${Math.round(km)} km`;
}

function Stars({ score, count }: { score: number; count: number }) {
	if (count === 0) {
		return <span className="text-xs text-muted">aucun avis</span>;
	}

	return (
		<span className="flex items-center gap-1.5 text-xs text-muted">
			<span className="flex gap-px" aria-hidden="true">
				{[0, 1, 2, 3, 4].map((index) => (
					<span key={index} className="relative text-sm leading-none text-edge/50">
						★
						<span
							className="absolute inset-0 overflow-hidden text-matcha"
							style={{ width: `${Math.max(0, Math.min(1, score - index)) * 100}%` }}
						>
							★
						</span>
					</span>
				))}
			</span>
			{score.toFixed(1)} · {count} avis
		</span>
	);
}

function Gallery({ candidate }: { candidate: Candidate }) {
	const ids = (candidate.photo_ids ?? "").split(",").filter(Boolean);
	const [index, setIndex] = useState(0);
	const current = ids[index] ?? candidate.profile_photo_id;

	function step(offset: number) {
		setIndex((previous) => (previous + offset + ids.length) % ids.length);
	}

	return (
		<div className="relative h-56 shrink-0 overflow-hidden rounded-3xl bg-leaf/50 ring-1 ring-edge/30 md:h-full">
			{current !== null ? (
				<Image
					key={current}
					src={`/api/photos/${current}`}
					alt=""
					fill
					priority
					unoptimized
					sizes="(min-width: 768px) 24rem, 100vw"
					className="animate-[pop-in_250ms_ease-out] object-cover"
				/>
			) : (
				<span className="flex size-full items-center justify-center">
					<MatchaBowl className="size-16 opacity-25" />
				</span>
			)}

			{candidate.is_online ? (
				<span className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-xs font-medium backdrop-blur-sm">
					<span className="size-1.5 rounded-full bg-matcha" />
					En ligne
				</span>
			) : null}

			{ids.length > 1 ? (
				<>
					<button
						type="button"
						onClick={() => step(-1)}
						aria-label="Photo précédente"
						className="absolute top-1/2 left-3 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-lg text-ink shadow-sm backdrop-blur-sm transition hover:bg-white"
					>
						‹
					</button>
					<button
						type="button"
						onClick={() => step(1)}
						aria-label="Photo suivante"
						className="absolute top-1/2 right-3 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-lg text-ink shadow-sm backdrop-blur-sm transition hover:bg-white"
					>
						›
					</button>

					<span className="absolute inset-x-0 bottom-4 flex justify-center gap-1.5">
						{ids.map((id, position) => (
							<span
								key={id}
								className={`h-1.5 rounded-full transition-all ${
									position === index ? "w-5 bg-white" : "w-1.5 bg-white/60"
								}`}
							/>
						))}
					</span>
				</>
			) : null}

		</div>
	);
}

function LikeButton({
	liked,
	pending,
	error,
	onToggle,
}: {
	liked: boolean;
	pending: boolean;
	error: string | null;
	onToggle: () => void;
}) {
	return (
		<div className="flex flex-col items-end gap-1">
			<button
				type="button"
				aria-pressed={liked}
				aria-label={liked ? "Retirer le like" : "Liker ce profil"}
				disabled={pending}
				onClick={onToggle}
				className={`flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full ring-1 transition-transform duration-200 ease-out hover:scale-105 active:scale-95 disabled:cursor-progress ${
					liked
						? "bg-matcha text-white ring-matcha"
						: "bg-white text-matcha ring-edge/40"
				}`}
			>
				<svg
					viewBox="0 0 20 20"
					className={`size-6 ${liked ? "motion-safe:animate-[pop-in_250ms_ease-out]" : ""}`}
					aria-hidden="true"
				>
					<path
						d="M10 17S2.5 12.5 2.5 7.6A4.1 4.1 0 0 1 10 5.3a4.1 4.1 0 0 1 7.5 2.3C17.5 12.5 10 17 10 17Z"
						fill={liked ? "currentColor" : "none"}
						stroke="currentColor"
						strokeWidth="1.6"
						strokeLinejoin="round"
					/>
				</svg>
			</button>

			{error !== null ? (
				<span className="max-w-40 text-right text-xs text-muted">{error}</span>
			) : null}
		</div>
	);
}

export function CandidateSlide({
	candidate,
	liked,
	pending,
	error,
	onLike,
}: {
	candidate: Candidate;
	liked: boolean;
	pending: boolean;
	error: string | null;
	onLike: () => void;
}) {
	const tags = (candidate.tags ?? "").split(",").filter(Boolean).slice(0, 8);

	return (
		<article className="grid size-full gap-3 overflow-hidden rounded-3xl bg-white/60 p-3 ring-1 ring-edge/30 md:grid-cols-2">
			<Gallery candidate={candidate} />

			<div className="grid min-h-0 rounded-2xl bg-cream ring-1 ring-edge/25 md:grid-rows-[auto_1fr_auto]">
				<div className="border-b border-edge/20 px-5 py-4">
					<div className="flex items-start justify-between gap-3">
						<h2 className="flex items-baseline gap-2.5 text-2xl leading-tight font-semibold tracking-tight">
							<span className="truncate">{candidate.first_name}</span>
							<span className="font-normal text-muted">{candidate.age}</span>
						</h2>

						<LikeButton
							liked={liked}
							pending={pending}
							error={error}
							onToggle={onLike}
						/>
					</div>

					<p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
						<span>{candidate.city ?? "Ville inconnue"}</span>
						<span aria-hidden="true">·</span>
						<span>{distance(candidate.distance_km)}</span>
						<span aria-hidden="true">·</span>
						<span>{candidate.gender ? GENDERS[candidate.gender] : "—"}</span>
					</p>

					<div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
						<Stars score={candidate.review_average} count={candidate.review_count} />
						{candidate.common_tags > 0 ? (
							<span className="text-xs font-medium text-matcha">
								{candidate.common_tags} centre{candidate.common_tags > 1 ? "s" : ""} en
								commun
							</span>
						) : null}
					</div>
				</div>

				<div className="min-h-0 overflow-y-auto border-b border-edge/20 px-5 py-4 text-sm leading-relaxed">
					{candidate.biography !== null ? (
						candidate.biography
					) : (
						<span className="text-muted">Pas encore de biographie.</span>
					)}
				</div>

				<div className="flex flex-col gap-4 px-5 pt-5 pb-5">
					{tags.length > 0 ? (
						<ul className="flex flex-wrap gap-2 text-sm text-matcha-dark">
							{tags.map((tag) => (
								<li key={tag} className="rounded-md bg-leaf/50 px-2.5 py-1">
									#{tag}
								</li>
							))}
						</ul>
					) : (
						<p className="text-sm text-muted">Aucun centre d’intérêt renseigné.</p>
					)}

					<Link
						href={`/users/${candidate.id}`}
						className="self-start text-sm text-matcha underline decoration-matcha/40 underline-offset-4 transition-colors duration-200 ease-out hover:decoration-matcha"
					>
						Voir le profil
					</Link>
				</div>
			</div>
		</article>
	);
}
