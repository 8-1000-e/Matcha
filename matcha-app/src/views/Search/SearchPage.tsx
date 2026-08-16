"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { MatchaBowl } from "@/components/Brand/Brand";
import { Alert } from "@/components/Form/Alert";
import { Footer } from "@/components/Layout/Footer";
import { PrivateScreen } from "@/components/Layout/Screen";
import { fetchFeed, type Candidate } from "@/lib/discovery/client";

const DEBOUNCE_MS = 300;

function distance(km: number | null) {
	if (km === null) {
		return "distance inconnue";
	}
	return km < 1 ? "à moins d’1 km" : `à ${Math.round(km)} km`;
}

function Result({ candidate }: { candidate: Candidate }) {
	return (
		<li>
			<Link
				href={`/users/${candidate.id}`}
				className="flex items-center gap-3 rounded-2xl border border-edge/30 bg-white/60 p-3 transition-colors duration-200 ease-out hover:bg-leaf/30"
			>
				<span className="relative size-14 shrink-0 overflow-hidden rounded-full bg-leaf/50">
					{candidate.profile_photo_id === null ? (
						<span className="flex size-full items-center justify-center">
							<MatchaBowl className="size-6 opacity-30" />
						</span>
					) : (
						<Image
							src={`/api/photos/${candidate.profile_photo_id}`}
							alt=""
							fill
							unoptimized
							sizes="56px"
							className="object-cover"
						/>
					)}
				</span>

				<span className="flex min-w-0 flex-1 flex-col">
					<span className="flex items-baseline gap-2">
						<span className="truncate font-medium">@{candidate.username}</span>
						{candidate.is_online ? (
							<span className="size-1.5 shrink-0 rounded-full bg-matcha" />
						) : null}
					</span>
					<span className="truncate text-sm text-muted">
						{candidate.first_name} · {candidate.age} ans ·{" "}
						{candidate.city ?? "ville inconnue"}
					</span>
				</span>

				<span className="shrink-0 text-xs text-muted">
					{distance(candidate.distance_km)}
				</span>
			</Link>
		</li>
	);
}

export function SearchPage() {
	const [query, setQuery] = useState("");
	const [results, setResults] = useState<Candidate[] | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);

	function change(value: string) {
		setQuery(value);
		if (value.trim().length === 0) {
			setResults(null);
			setError(null);
			setBusy(false);
			return;
		}
		setBusy(true);
	}

	useEffect(() => {
		const needle = query.trim();
		if (needle.length === 0) {
			return;
		}

		let live = true;
		const timer = window.setTimeout(() => {
			void fetchFeed({ username: needle }, null, 0).then((result) => {
				if (!live) {
					return;
				}
				setBusy(false);
				if (!result.ok) {
					setError(result.errors[0]?.message ?? null);
					setResults([]);
					return;
				}
				setError(null);
				setResults(result.data.items);
			});
		}, DEBOUNCE_MS);

		return () => {
			live = false;
			window.clearTimeout(timer);
		};
	}, [query]);

	return (
		<PrivateScreen
			width="wide"
			title="Rechercher"
			intro="Trouvez quelqu’un par son nom, son prénom ou son nom d’utilisateur."
			footer={<Footer />}
		>
			<label className="mx-auto flex w-full max-w-xl items-center gap-3 rounded-full border border-edge/60 bg-white px-5 shadow-[0_1px_2px_rgba(38,48,28,0.06)] transition-colors duration-200 ease-out focus-within:border-matcha focus-within:shadow-[0_0_0_3px_rgba(76,122,47,0.12)]">
				<svg
					viewBox="0 0 24 24"
					className="size-5 shrink-0 text-muted"
					fill="none"
					stroke="currentColor"
					strokeWidth="1.8"
					strokeLinecap="round"
					aria-hidden="true"
				>
					<circle cx="11" cy="11" r="6" />
					<path d="m20 20-3.6-3.6" />
				</svg>
				<input
					type="search"
					value={query}
					onChange={(event) => change(event.target.value)}
					placeholder="Nom, prénom ou nom d’utilisateur"
					autoComplete="off"
					className="min-h-12 flex-1 bg-transparent text-base outline-none focus-visible:outline-none"
				/>
			</label>

			{error !== null ? (
				<div className="mx-auto mt-4 max-w-xl">
					<Alert>{error}</Alert>
				</div>
			) : null}

			<div className="mt-5">
				{results === null ? (
					<p className="py-10 text-center text-sm text-muted">
						{busy ? "Recherche…" : "Tapez un nom pour commencer."}
					</p>
				) : results.length === 0 ? (
					<p className="py-10 text-center text-sm text-muted">
						{busy ? "Recherche…" : "Aucun profil ne correspond."}
					</p>
				) : (
					<ul className="mx-auto flex max-w-xl flex-col gap-2">
						{results.map((candidate) => (
							<Result key={candidate.id} candidate={candidate} />
						))}
					</ul>
				)}
			</div>
		</PrivateScreen>
	);
}
