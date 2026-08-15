"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { MatchaBowl } from "@/components/Brand/Brand";
import { BackLink } from "@/components/Form/Button";
import { PrivateScreen } from "@/components/Layout/Screen";
import { ModerationMenu } from "@/components/Moderation/ModerationMenu";
import type { ProfilePhoto } from "@/lib/profile/profile";
import type { PublicProfilePayload } from "@/lib/profile/public";
import {
	likeUser,
	recordView,
	unlikeUser,
	type ReviewPayload,
} from "@/lib/profile/publicClient";

const GENDERS: Record<string, string> = {
	woman: "Femme",
	man: "Homme",
	non_binary: "Non-binaire",
	other: "Autre",
};

const ORIENTATIONS: Record<string, string> = {
	hetero: "Hétéro",
	homo: "Homo",
	bi: "Bi",
};

function place(profile: PublicProfilePayload) {
	const city = profile.city ?? "Ville inconnue";
	if (profile.distance_km === null) {
		return city;
	}
	return profile.distance_km < 1
		? `${city} · à moins d’1 km`
		: `${city} · à ${Math.round(profile.distance_km)} km`;
}

function when(iso: string) {
	return new Date(iso).toLocaleDateString("fr-FR", {
		day: "numeric",
		month: "long",
		year: "numeric",
	});
}

function lastSeen(iso: string) {
	const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
	if (minutes < 60) {
		return `Vu il y a ${Math.max(1, minutes)} min`;
	}
	if (minutes < 24 * 60) {
		const hours = Math.round(minutes / 60);
		return `Vu il y a ${hours} h`;
	}
	return `Vu le ${new Date(iso).toLocaleDateString("fr-FR", {
		day: "numeric",
		month: "long",
		hour: "2-digit",
		minute: "2-digit",
	})}`;
}

function Stars({
	score,
	className = "text-sm",
}: {
	score: number;
	className?: string;
}) {
	return (
		<span className={`flex gap-px ${className}`} aria-hidden="true">
			{[0, 1, 2, 3, 4].map((index) => (
				<span key={index} className="relative leading-none text-edge/40">
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
	);
}

function Stat({ value, label }: { value: string; label: string }) {
	return (
		<span className="flex items-baseline gap-1.5">
			<span className="font-semibold tabular-nums">{value}</span>
			<span className="text-muted">{label}</span>
		</span>
	);
}

function Avatar({ profile }: { profile: PublicProfilePayload }) {
	const photo
		= profile.photos.find((entry) => entry.is_profile) ?? profile.photos[0];

	return (
		<div className="relative shrink-0 self-start">
			<div
				className={`relative size-24 overflow-hidden rounded-full bg-leaf/50 ring-2 sm:size-32 ${
					profile.is_online ? "ring-matcha" : "ring-edge/30"
				}`}
			>
				{photo !== undefined ? (
					<Image
						src={photo.url}
						alt=""
						fill
						priority
						unoptimized
						sizes="128px"
						className="object-cover"
					/>
				) : (
					<span className="flex size-full items-center justify-center">
						<MatchaBowl className="size-10 opacity-25" />
					</span>
				)}
			</div>

			{profile.is_online ? (
				<span className="absolute right-1 bottom-1 size-4 rounded-full border-2 border-cream bg-matcha" />
			) : null}
		</div>
	);
}

function LikeAction({ profile }: { profile: PublicProfilePayload }) {
	const [liked, setLiked] = useState(profile.viewer_liked_target);
	const [matched, setMatched] = useState(profile.is_connected);
	const [pending, setPending] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function toggle() {
		setError(null);
		setPending(true);

		if (!liked) {
			setLiked(true);
			const result = await likeUser(profile.id);
			setPending(false);
			if (!result.ok) {
				setLiked(false);
				setError(result.errors[0]?.message ?? null);
				return;
			}
			setMatched(result.data.matched);
			return;
		}

		setLiked(false);
		const result = await unlikeUser(profile.id);
		setPending(false);
		if (!result.ok) {
			setLiked(true);
			setError(result.errors[0]?.message ?? null);
			return;
		}
		setMatched(false);
	}

	return (
		<div className="flex flex-wrap items-center gap-2">
			<button
				type="button"
				aria-pressed={liked}
				disabled={pending}
				onClick={() => void toggle()}
				className={`flex h-9 cursor-pointer items-center gap-2 rounded-lg px-4 text-sm font-medium transition-colors duration-200 ease-out disabled:cursor-progress ${
					liked
						? "bg-leaf/60 text-matcha-dark hover:bg-leaf"
						: "bg-matcha text-white hover:bg-matcha-dark"
				}`}
			>
				<svg viewBox="0 0 20 20" className="size-4" aria-hidden="true">
					<path
						d="M10 17S2.5 12.5 2.5 7.6A4.1 4.1 0 0 1 10 5.3a4.1 4.1 0 0 1 7.5 2.3C17.5 12.5 10 17 10 17Z"
						fill={liked ? "currentColor" : "none"}
						stroke="currentColor"
						strokeWidth="1.6"
						strokeLinejoin="round"
					/>
				</svg>
				{liked ? "Aimé" : "Liker"}
			</button>

			{matched ? (
				<span className="rounded-lg bg-matcha px-3 py-1.5 text-xs font-medium text-white">
					Connectés
				</span>
			) : profile.target_liked_viewer ? (
				<span className="rounded-lg bg-white px-3 py-1.5 text-xs font-medium ring-1 ring-edge/40">
					Vous a liké
				</span>
			) : null}

			{error !== null ? <span className="text-xs text-muted">{error}</span> : null}
		</div>
	);
}

function Lightbox({
	photos,
	index,
	onClose,
	onStep,
}: {
	photos: ProfilePhoto[];
	index: number;
	onClose: () => void;
	onStep: (offset: number) => void;
}) {
	useEffect(() => {
		const onKey = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				onClose();
			}
			if (event.key === "ArrowLeft") {
				onStep(-1);
			}
			if (event.key === "ArrowRight") {
				onStep(1);
			}
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [onClose, onStep]);

	const photo = photos[index];
	if (photo === undefined) {
		return null;
	}

	return (
		<div
			className="fixed inset-0 z-20 flex items-center justify-center bg-ink/80 p-6 backdrop-blur-sm"
			role="dialog"
			aria-modal="true"
			aria-label={`Photo ${index + 1} sur ${photos.length}`}
		>
			<button
				type="button"
				onClick={onClose}
				aria-label="Fermer"
				className="absolute inset-0 cursor-zoom-out"
			/>

			<div className="relative aspect-4/5 w-full max-w-lg overflow-hidden rounded-2xl">
				<Image
					key={photo.id}
					src={photo.url}
					alt=""
					fill
					unoptimized
					sizes="32rem"
					className="object-cover"
				/>
			</div>

			{photos.length > 1 ? (
				<>
					<button
						type="button"
						onClick={() => onStep(-1)}
						aria-label="Photo précédente"
						className="absolute left-4 flex size-10 cursor-pointer items-center justify-center rounded-full bg-white/90 text-lg text-ink"
					>
						‹
					</button>
					<button
						type="button"
						onClick={() => onStep(1)}
						aria-label="Photo suivante"
						className="absolute right-4 flex size-10 cursor-pointer items-center justify-center rounded-full bg-white/90 text-lg text-ink"
					>
						›
					</button>
				</>
			) : null}
		</div>
	);
}

function PhotoGrid({ photos }: { photos: ProfilePhoto[] }) {
	const [open, setOpen] = useState<number | null>(null);

	if (photos.length === 0) {
		return (
			<p className="py-12 text-center text-sm text-muted">Aucune photo publiée.</p>
		);
	}

	return (
		<>
			<ul className="flex flex-wrap justify-center gap-1 sm:gap-2">
				{photos.map((photo, index) => (
					<li
						key={photo.id}
						className="w-[calc((100%-0.5rem)/3)] sm:w-[calc((100%-1rem)/3)]"
					>
						<button
							type="button"
							onClick={() => setOpen(index)}
							aria-label={`Agrandir la photo ${index + 1}`}
							className="relative block aspect-square w-full cursor-zoom-in overflow-hidden rounded-sm bg-leaf/40 transition-opacity duration-200 ease-out hover:opacity-85"
						>
							<Image
								src={photo.url}
								alt=""
								fill
								unoptimized
								sizes="(min-width: 768px) 14rem, 33vw"
								className="object-cover"
							/>
						</button>
					</li>
				))}
			</ul>

			{open !== null ? (
				<Lightbox
					photos={photos}
					index={open}
					onClose={() => setOpen(null)}
					onStep={(offset) =>
						setOpen((current) =>
							current === null
								? null
								: (current + offset + photos.length) % photos.length,
						)}
				/>
			) : null}
		</>
	);
}

function Reviews({ reviews }: { reviews: ReviewPayload[] }) {
	if (reviews.length === 0) {
		return (
			<p className="py-12 text-center text-sm text-muted">
				Personne n’a encore laissé d’avis.
			</p>
		);
	}

	return (
		<ul className="flex flex-col divide-y divide-edge/20">
			{reviews.map((review) => (
				<li key={review.id} className="flex flex-col gap-1.5 py-4">
					<div className="flex flex-wrap items-center gap-x-3 gap-y-1">
						<span className="text-sm font-medium">@{review.author_username}</span>
						<Stars score={review.score} className="text-xs" />
						<span className="text-xs text-muted">{when(review.updated_at)}</span>
					</div>
					{review.body !== null ? (
						<p className="text-sm leading-relaxed">{review.body}</p>
					) : null}
				</li>
			))}
		</ul>
	);
}

export function PublicProfilePage({
	profile,
	reviews,
}: {
	profile: PublicProfilePayload;
	reviews: ReviewPayload[];
}) {
	const [tab, setTab] = useState<"photos" | "reviews">("photos");
	const seen = useRef(false);
	const router = useRouter();

	useEffect(() => {
		if (seen.current) {
			return;
		}
		seen.current = true;
		void recordView(profile.id);
	}, [profile.id]);

	const tabs = [
		{ key: "photos" as const, label: "Photos", count: profile.photos.length },
		{ key: "reviews" as const, label: "Avis", count: profile.review_count },
	];

	return (
		<PrivateScreen
			width="wide"
			footer={<BackLink href="/feed" label="Retour au feed" />}
		>
			<header className="flex gap-5 sm:gap-10">
				<Avatar profile={profile} />

				<div className="flex min-w-0 flex-col gap-3">
					<div className="flex flex-wrap items-center gap-x-4 gap-y-2">
						<h1 className="truncate text-xl font-semibold tracking-tight">
							@{profile.username}
						</h1>
						<LikeAction profile={profile} />
						<ModerationMenu
							userId={profile.id}
							name={profile.first_name}
							onBlocked={() => {
								router.push("/feed");
								router.refresh();
							}}
						/>
					</div>

					<div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
						<Stat
							value={String(profile.photos.length)}
							label={profile.photos.length > 1 ? "photos" : "photo"}
						/>

						{profile.review_count === 0 ? (
							<span className="text-muted">Aucun avis</span>
						) : (
							<span className="flex items-center gap-2">
								<Stars score={profile.review_average} className="text-sm" />
								<span className="font-semibold tabular-nums">
									{profile.review_average.toFixed(1)}
								</span>
								<span className="text-muted">
									{profile.review_count} avis
								</span>
							</span>
						)}

						{profile.common_tags > 0 ? (
							<Stat
								value={String(profile.common_tags)}
								label={
									profile.common_tags > 1
										? "centres en commun"
										: "centre en commun"
								}
							/>
						) : null}
					</div>

					<div className="text-sm">
						<p className="font-medium">
							{profile.first_name} {profile.last_name}
							<span className="ml-2 font-normal text-muted">
								{profile.age} ans
								{profile.gender !== null ? ` · ${GENDERS[profile.gender]}` : ""}
								{` · ${ORIENTATIONS[profile.orientation] ?? profile.orientation}`}
							</span>
						</p>

						{profile.biography !== null ? (
							<p className="mt-1 leading-relaxed whitespace-pre-line">
								{profile.biography}
							</p>
						) : null}

						<p className="mt-1 text-muted">
							{place(profile)}
							{profile.neighborhood !== null ? ` · ${profile.neighborhood}` : ""}
						</p>

						<p className="mt-0.5 text-xs">
							{profile.is_online ? (
								<span className="inline-flex items-center gap-1.5 font-medium text-matcha">
									<span className="size-1.5 rounded-full bg-matcha" />
									En ligne
								</span>
							) : profile.last_seen_at !== null ? (
								<span className="text-muted">{lastSeen(profile.last_seen_at)}</span>
							) : (
								<span className="text-muted">Jamais connecté</span>
							)}
						</p>
					</div>

					{profile.tags.length > 0 ? (
						<ul className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-matcha">
							{profile.tags.map((tag) => (
								<li key={tag}>#{tag}</li>
							))}
						</ul>
					) : null}
				</div>
			</header>

			<nav className="mt-8 flex justify-center gap-10 border-t border-edge/30">
				{tabs.map((entry) => (
					<button
						key={entry.key}
						type="button"
						onClick={() => setTab(entry.key)}
						aria-current={tab === entry.key}
						className={`-mt-px cursor-pointer border-t-2 px-2 pt-4 pb-1 text-xs font-medium tracking-[0.12em] uppercase transition-colors duration-200 ease-out ${
							tab === entry.key
								? "border-matcha text-ink"
								: "border-transparent text-muted hover:text-ink"
						}`}
					>
						{entry.label}
						<span className="ml-2 tabular-nums opacity-70">{entry.count}</span>
					</button>
				))}
			</nav>

			<div className="mt-4">
				{tab === "photos" ? (
					<PhotoGrid photos={profile.photos} />
				) : (
					<Reviews reviews={reviews} />
				)}
			</div>
		</PrivateScreen>
	);
}
