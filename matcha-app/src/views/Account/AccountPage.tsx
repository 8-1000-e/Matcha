"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { MatchaBowl } from "@/components/Brand/Brand";
import { Alert } from "@/components/Form/Alert";
import { ActionButton } from "@/components/Form/Button";
import { Footer } from "@/components/Layout/Footer";
import { PrivateScreen } from "@/components/Layout/Screen";
import { TAG_LABELS } from "@/lib/db/schema/tags";
import { MINIMUM_TAGS } from "@/lib/db/types";
import {
	addPhoto,
	getProfile,
	pickProfilePhoto,
	removePhoto,
	saveProfile,
	saveTags,
	type Gender,
	type Orientation,
	type Profile,
} from "@/lib/profile/client";
import { fetchMyReviews, type ReviewPayload } from "@/lib/profile/publicClient";

const GENDERS: { value: Gender; label: string }[] = [
	{ value: "woman", label: "Femme" },
	{ value: "man", label: "Homme" },
	{ value: "non_binary", label: "Non-binaire" },
	{ value: "other", label: "Autre" },
];

const ORIENTATIONS: { value: Orientation; label: string }[] = [
	{ value: "hetero", label: "Hétérosexuel·le" },
	{ value: "homo", label: "Homosexuel·le" },
	{ value: "bi", label: "Bisexuel·le" },
	{ value: "pan", label: "Pansexuel·le" },
	{ value: "other", label: "Autre" },
];

const MAXIMUM_TAGS = 10;

const FIELD
	= "min-h-10 w-full rounded-lg border border-edge/60 bg-white px-3 text-sm transition-colors duration-200 ease-out hover:border-matcha/60 focus-visible:border-matcha";

const GHOST
	= "flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-edge bg-white/70 px-3 text-sm font-medium transition-colors duration-200 ease-out hover:bg-leaf/50 disabled:cursor-progress";

function age(birthDate: string) {
	const born = new Date(birthDate);
	const now = new Date();
	let years = now.getFullYear() - born.getFullYear();
	const month = now.getMonth() - born.getMonth();
	if (month < 0 || (month === 0 && now.getDate() < born.getDate())) {
		years -= 1;
	}
	return years;
}

function Stat({ value, label }: { value: string; label: string }) {
	return (
		<span className="flex items-baseline gap-1.5">
			<span className="font-semibold tabular-nums">{value}</span>
			<span className="text-muted">{label}</span>
		</span>
	);
}

function Stars({ score }: { score: number }) {
	return (
		<span className="flex gap-px text-sm" aria-hidden="true">
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

function Reviews() {
	const [reviews, setReviews] = useState<ReviewPayload[] | null>(null);
	const [average, setAverage] = useState(0);
	const [count, setCount] = useState(0);

	useEffect(() => {
		let live = true;
		void fetchMyReviews().then((result) => {
			if (!live) {
				return;
			}
			if (result.ok) {
				setReviews(result.data.reviews);
				setAverage(result.data.review_average);
				setCount(result.data.review_count);
				return;
			}
			setReviews([]);
		});
		return () => {
			live = false;
		};
	}, []);

	return (
		<section className="mt-8 border-t border-edge/30 pt-6">
			<h2 className="flex flex-wrap items-center gap-3 text-sm font-semibold">
				Avis reçus
				{count === 0 ? (
					<span className="font-normal text-muted">aucun avis</span>
				) : (
					<span className="flex items-center gap-2 font-normal">
						<Stars score={average} />
						<span className="text-muted tabular-nums">
							{average.toFixed(1)} · {count} avis
						</span>
					</span>
				)}
			</h2>

			{reviews === null ? (
				<p className="py-8 text-center text-sm text-muted">Chargement…</p>
			) : reviews.length === 0 ? (
				<p className="py-8 text-center text-sm text-muted">
					Personne ne vous a encore laissé d’avis.
				</p>
			) : (
				<ul className="mt-3 flex flex-col divide-y divide-edge/20">
					{reviews.map((review) => (
						<li key={review.id} className="flex flex-col gap-1.5 py-4">
							<div className="flex flex-wrap items-center gap-x-3 gap-y-1">
								<span className="text-sm font-medium">
									@{review.author_username}
								</span>
								<Stars score={review.score} />
								<span className="text-xs text-muted">
									{new Date(review.updated_at).toLocaleDateString("fr-FR", {
										day: "numeric",
										month: "long",
										year: "numeric",
									})}
								</span>
							</div>
							{review.body !== null ? (
								<p className="text-sm leading-relaxed">{review.body}</p>
							) : null}
						</li>
					))}
				</ul>
			)}
		</section>
	);
}

function Identity({
	profile,
	onSaved,
	onCancel,
}: {
	profile: Profile;
	onSaved: () => Promise<void>;
	onCancel: () => void;
}) {
	const [firstName, setFirstName] = useState(profile.first_name);
	const [lastName, setLastName] = useState(profile.last_name);
	const [gender, setGender] = useState<Gender | "">(profile.gender ?? "");
	const [orientation, setOrientation] = useState<Orientation>(profile.orientation);
	const [biography, setBiography] = useState(profile.biography ?? "");
	const [wanted, setWanted] = useState<string[]>(profile.tags);
	const [filter, setFilter] = useState("");
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const visible = TAG_LABELS.filter((label) =>
		label.toLowerCase().includes(filter.trim().toLowerCase()),
	);

	function toggle(label: string) {
		setError(null);
		setWanted((current) =>
			current.includes(label)
				? current.filter((entry) => entry !== label)
				: current.length < MAXIMUM_TAGS
					? [...current, label]
					: current,
		);
	}

	async function submit(event: React.FormEvent) {
		event.preventDefault();
		setError(null);

		if (biography.trim().length === 0) {
			setError("La biographie est obligatoire : votre profil doit rester complet.");
			return;
		}
		if (gender === "") {
			setError("Le genre est obligatoire : votre profil doit rester complet.");
			return;
		}
		if (wanted.length < MINIMUM_TAGS) {
			setError(`Gardez au moins ${MINIMUM_TAGS} centres d’intérêt.`);
			return;
		}

		setBusy(true);
		const saved = await saveProfile({
			first_name: firstName,
			last_name: lastName,
			gender,
			orientation,
			biography,
		});
		if (!saved.ok) {
			setBusy(false);
			setError(saved.errors[0]?.message ?? null);
			return;
		}

		const tagged = await saveTags(wanted);
		setBusy(false);
		if (!tagged.ok) {
			setError(tagged.errors[0]?.message ?? null);
			return;
		}

		await onSaved();
	}

	return (
		<form onSubmit={(event) => void submit(event)} className="flex flex-col gap-4">
			<div className="grid gap-4 sm:grid-cols-2">
				<label className="flex flex-col gap-1.5">
					<span className="text-xs text-muted">Prénom</span>
					<input
						value={firstName}
						onChange={(event) => setFirstName(event.target.value)}
						className={FIELD}
					/>
				</label>
				<label className="flex flex-col gap-1.5">
					<span className="text-xs text-muted">Nom</span>
					<input
						value={lastName}
						onChange={(event) => setLastName(event.target.value)}
						className={FIELD}
					/>
				</label>
				<label className="flex flex-col gap-1.5">
					<span className="text-xs text-muted">Genre</span>
					<select
						value={gender}
						onChange={(event) => setGender(event.target.value as Gender)}
						className={FIELD}
					>
						<option value="" disabled>
							À renseigner
						</option>
						{GENDERS.map((entry) => (
							<option key={entry.value} value={entry.value}>
								{entry.label}
							</option>
						))}
					</select>
				</label>
				<label className="flex flex-col gap-1.5">
					<span className="text-xs text-muted">Orientation</span>
					<select
						value={orientation}
						onChange={(event) => setOrientation(event.target.value as Orientation)}
						className={FIELD}
					>
						{ORIENTATIONS.map((entry) => (
							<option key={entry.value} value={entry.value}>
								{entry.label}
							</option>
						))}
					</select>
				</label>
			</div>

			<label className="flex flex-col gap-1.5">
				<span className="text-xs text-muted">
					Biographie
					<span className="ml-2 tabular-nums">{biography.length} / 500</span>
				</span>
				<textarea
					value={biography}
					onChange={(event) => setBiography(event.target.value)}
					rows={4}
					maxLength={500}
					className={`${FIELD} py-2 leading-relaxed`}
				/>
			</label>

			<div className="flex flex-col gap-2">
				<label htmlFor="tagFilter" className="text-xs text-muted">
					Centres d’intérêt
					<span className="ml-2 tabular-nums">
						{wanted.length} sélectionné{wanted.length > 1 ? "s" : ""}, entre{" "}
						{MINIMUM_TAGS} et {MAXIMUM_TAGS}
					</span>
				</label>
				<input
					id="tagFilter"
					type="search"
					value={filter}
					onChange={(event) => setFilter(event.target.value)}
					placeholder="Filtrer la liste"
					className={FIELD}
				/>
				<div className="flex max-h-44 flex-wrap gap-1.5 overflow-y-auto rounded-lg border border-edge/40 bg-white/50 p-2">
					{visible.map((label) => {
						const active = wanted.includes(label);
						return (
							<button
								key={label}
								type="button"
								onClick={() => toggle(label)}
								aria-pressed={active}
								disabled={!active && wanted.length >= MAXIMUM_TAGS}
								className={`cursor-pointer rounded-full border px-3 py-1.5 text-sm transition-colors duration-200 ease-out disabled:cursor-not-allowed disabled:opacity-40 ${
									active
										? "border-matcha bg-matcha font-medium text-white"
										: "border-edge/60 bg-white/70 hover:border-matcha/50 hover:bg-leaf/40"
								}`}
							>
								#{label}
							</button>
						);
					})}

					{visible.length === 0 ? (
						<p className="px-1 py-2 text-xs text-muted">
							Aucun centre d’intérêt ne correspond.
						</p>
					) : null}
				</div>
			</div>

			{error !== null ? <Alert>{error}</Alert> : null}

			<div className="flex flex-wrap gap-3">
				<div className="w-44">
					<ActionButton type="submit" tone="primary" busy={busy}>
						Enregistrer
					</ActionButton>
				</div>
				<div className="w-32">
					<ActionButton type="button" tone="secondary" onClick={onCancel}>
						Annuler
					</ActionButton>
				</div>
			</div>
		</form>
	);
}

function Photos({
	profile,
	onChanged,
}: {
	profile: Profile;
	onChanged: () => Promise<void>;
}) {
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const full = profile.photos.length >= 5;

	async function upload(file: File) {
		setBusy(true);
		setError(null);
		const result = await addPhoto(file);
		setBusy(false);
		if (!result.ok) {
			setError(result.errors[0]?.message ?? null);
			return;
		}
		await onChanged();
	}

	async function makeProfile(id: string) {
		setBusy(true);
		setError(null);
		const result = await pickProfilePhoto(id);
		setBusy(false);
		if (!result.ok) {
			setError(result.errors[0]?.message ?? null);
			return;
		}
		await onChanged();
	}

	async function drop(id: string, isProfile: boolean) {
		if (isProfile && profile.photos.length === 1) {
			setError(
				"Gardez au moins une photo de profil : sans elle, votre profil devient incomplet.",
			);
			return;
		}
		setBusy(true);
		setError(null);
		const result = await removePhoto(id);
		setBusy(false);
		if (!result.ok) {
			setError(result.errors[0]?.message ?? null);
			return;
		}
		await onChanged();
	}

	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<h2 className="text-sm font-semibold">
					Photos
					<span className="ml-2 font-normal text-muted tabular-nums">
						{profile.photos.length} / 5
					</span>
				</h2>

				<label
					className={`flex h-9 items-center gap-2 rounded-lg px-4 text-sm font-medium transition-colors duration-200 ease-out ${
						full || busy
							? "cursor-not-allowed bg-leaf/40 text-muted"
							: "cursor-pointer bg-matcha text-white hover:bg-matcha-dark"
					}`}
				>
					<svg
						viewBox="0 0 20 20"
						className="size-4"
						fill="none"
						stroke="currentColor"
						strokeWidth="1.8"
						strokeLinecap="round"
						aria-hidden="true"
					>
						<path d="M10 4.5v11M4.5 10h11" />
					</svg>
					{busy ? "Envoi…" : full ? "Maximum atteint" : "Ajouter une photo"}
					<input
						type="file"
						accept="image/jpeg,image/png,image/webp"
						disabled={busy || full}
						onChange={(event) => {
							const file = event.target.files?.[0];
							event.target.value = "";
							if (file !== undefined) {
								void upload(file);
							}
						}}
						className="sr-only"
					/>
				</label>
			</div>

			{error !== null ? <Alert>{error}</Alert> : null}

			{profile.photos.length === 0 ? (
				<p className="py-10 text-center text-sm text-muted">Aucune photo.</p>
			) : (
				<ul className="flex flex-wrap justify-center gap-2">
					{profile.photos.map((photo) => (
						<li
							key={photo.id}
							className="group relative aspect-square w-[calc((100%-1rem)/3)] overflow-hidden rounded-lg bg-leaf/40 ring-1 ring-edge/30"
						>
							<Image
								src={photo.url}
								alt=""
								fill
								unoptimized
								sizes="(min-width: 768px) 14rem, 33vw"
								className="object-cover"
							/>

							{photo.is_profile ? (
								<span className="absolute top-2 left-2 rounded-md bg-matcha px-2 py-0.5 text-xs font-medium text-white">
									Photo de profil
								</span>
							) : null}

							<div className="absolute inset-x-0 bottom-0 flex justify-end gap-1.5 bg-linear-to-t from-ink/70 to-transparent p-2 opacity-0 transition-opacity duration-200 ease-out group-hover:opacity-100 focus-within:opacity-100">
								{photo.is_profile ? null : (
									<button
										type="button"
										disabled={busy}
										onClick={() => void makeProfile(photo.id)}
										aria-label="Définir comme photo de profil"
										title="Définir comme photo de profil"
										className="flex size-8 cursor-pointer items-center justify-center rounded-lg bg-white/90 text-ink transition-colors duration-200 ease-out hover:bg-white disabled:cursor-progress"
									>
										<svg
											viewBox="0 0 20 20"
											className="size-4"
											fill="none"
											stroke="currentColor"
											strokeWidth="1.8"
											strokeLinecap="round"
											strokeLinejoin="round"
											aria-hidden="true"
										>
											<path d="m4 10.5 4 4 8-8" />
										</svg>
									</button>
								)}

								<button
									type="button"
									disabled={busy}
									onClick={() => void drop(photo.id, photo.is_profile)}
									aria-label="Supprimer la photo"
									title="Supprimer la photo"
									className="flex size-8 cursor-pointer items-center justify-center rounded-lg bg-white/90 text-red-700 transition-colors duration-200 ease-out hover:bg-white disabled:cursor-progress"
								>
									<svg
										viewBox="0 0 20 20"
										className="size-4"
										fill="none"
										stroke="currentColor"
										strokeWidth="1.8"
										strokeLinecap="round"
										strokeLinejoin="round"
										aria-hidden="true"
									>
										<path d="M4 6h12M8 6V4.5h4V6M6.5 6l.6 9h5.8l.6-9" />
									</svg>
								</button>
							</div>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}

export function AccountPage() {
	const [profile, setProfile] = useState<Profile | null>(null);
	const [editing, setEditing] = useState(false);

	const reload = useCallback(async () => {
		const result = await getProfile();
		if (result.ok) {
			setProfile(result.data.profile);
			setEditing(false);
		}
	}, []);

	useEffect(() => {
		let live = true;
		void getProfile().then((result) => {
			if (live && result.ok) {
				setProfile(result.data.profile);
			}
		});
		return () => {
			live = false;
		};
	}, []);

	if (profile === null) {
		return (
			<PrivateScreen width="wide" footer={<Footer />}>
				<p className="py-16 text-center text-sm text-muted">Chargement…</p>
			</PrivateScreen>
		);
	}

	const photo = profile.photos.find((entry) => entry.is_profile)
		?? profile.photos[0];

	return (
		<PrivateScreen width="wide" footer={<Footer />}>
			<header className="flex gap-5 sm:gap-10">
				<div className="relative size-24 shrink-0 overflow-hidden rounded-full bg-leaf/50 ring-2 ring-matcha sm:size-32">
					{photo === undefined ? (
						<span className="flex size-full items-center justify-center">
							<MatchaBowl className="size-10 opacity-25" />
						</span>
					) : (
						<Image
							src={photo.url}
							alt=""
							fill
							priority
							unoptimized
							sizes="128px"
							className="object-cover"
						/>
					)}
				</div>

				<div className="flex min-w-0 flex-col gap-3">
					<div className="flex flex-wrap items-center gap-x-4 gap-y-2">
						<h1 className="truncate text-xl font-semibold tracking-tight">
							@{profile.username}
						</h1>
						<button
							type="button"
							onClick={() => setEditing(!editing)}
							className={GHOST}
						>
							{editing ? "Fermer l’édition" : "Modifier le profil"}
						</button>
					</div>

					<div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
						<Stat
							value={String(profile.photos.length)}
							label={profile.photos.length > 1 ? "photos" : "photo"}
						/>
						<Stat
							value={String(profile.tags.length)}
							label="centres d’intérêt"
						/>
					</div>

					<div className="text-sm">
						<p className="font-medium">
							{profile.first_name} {profile.last_name}
							<span className="ml-2 font-normal text-muted">
								{age(profile.birth_date)} ans
							</span>
						</p>

						{profile.biography !== null ? (
							<p className="mt-1 leading-relaxed whitespace-pre-line">
								{profile.biography}
							</p>
						) : null}

						<p className="mt-1 text-muted">
							{profile.city ?? "Ville inconnue"}
							{profile.neighborhood !== null ? ` · ${profile.neighborhood}` : ""}
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

			<div className="mt-8 border-t border-edge/30 pt-6">
				{editing ? (
					<Identity
						profile={profile}
						onSaved={reload}
						onCancel={() => setEditing(false)}
					/>
				) : (
					<Photos profile={profile} onChanged={reload} />
				)}
			</div>

			{editing ? null : <Reviews />}
		</PrivateScreen>
	);
}
