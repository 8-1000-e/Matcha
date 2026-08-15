import Image from "next/image";
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
		return null;
	}
	return km < 1 ? "moins d’1 km" : `${Math.round(km)} km`;
}

function Stars({ score, count }: { score: number; count: number }) {
	if (count === 0) {
		return <span className="text-xs text-muted">aucun avis</span>;
	}

	return (
		<span className="flex items-center gap-1 text-xs text-muted">
			<span className="flex gap-px" aria-hidden="true">
				{[0, 1, 2, 3, 4].map((index) => (
					<span key={index} className="relative text-sm leading-none text-edge">
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

export function CandidateCard({ candidate }: { candidate: Candidate }) {
	const place = [candidate.city, distance(candidate.distance_km)]
		.filter(Boolean)
		.join(" · ");

	return (
		<article className="flex flex-col overflow-hidden rounded-2xl bg-white ring-1 ring-edge/70 transition-shadow duration-200 hover:shadow-[0_12px_32px_-16px_rgba(38,48,28,0.35)]">
			<div className="relative aspect-square w-full bg-leaf/30">
				{candidate.profile_photo_id !== null ? (
					<Image
						src={`/api/photos/${candidate.profile_photo_id}`}
						alt=""
						fill
						unoptimized
						sizes="(min-width: 1024px) 25vw, 50vw"
						className="object-cover"
					/>
				) : (
					<span className="flex size-full items-center justify-center">
						<MatchaBowl className="size-10 opacity-30" />
					</span>
				)}

				{candidate.is_online === 1 ? (
					<span className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-medium backdrop-blur-sm">
						<span className="size-1.5 rounded-full bg-matcha" />
						En ligne
					</span>
				) : null}

				{candidate.common_tags > 0 ? (
					<span className="absolute top-3 right-3 rounded-full bg-matcha px-2.5 py-1 text-[11px] font-medium text-white">
						{candidate.common_tags} en commun
					</span>
				) : null}
			</div>

			<div className="flex flex-1 flex-col gap-1.5 p-3.5">
				<h2 className="flex items-baseline gap-2 text-base leading-tight font-semibold tracking-tight">
					<span className="truncate">{candidate.first_name}</span>
					<span className="font-normal text-muted">{candidate.age}</span>
				</h2>

				<p className="truncate text-xs text-muted">
					{place || "Localisation inconnue"}
				</p>

				<p className="text-xs text-muted">
					{candidate.gender ? GENDERS[candidate.gender] : "—"}
				</p>

				<Stars score={candidate.review_average} count={candidate.review_count} />
			</div>
		</article>
	);
}
