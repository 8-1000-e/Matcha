"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { MatchaBowl } from "@/components/Brand/Brand";
import { Alert } from "@/components/Form/Alert";
import { ActionButton } from "@/components/Form/Button";
import { PrivateScreen } from "@/components/Layout/Screen";
import { PresenceAvatar } from "@/components/Presence/PresenceAvatar";
import { MINIMUM_TAGS } from "@/lib/db/types";
import {
	listBlocked,
	unblockUser,
	type BlockedUser,
} from "@/lib/moderation/client";
import {
	addPhoto,
	getProfile,
	pickProfilePhoto,
	removePhoto,
	saveLocation,
	saveProfile,
	saveTags,
	type Gender,
	type Orientation,
	type Profile,
} from "@/lib/profile/client";

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
	const [tags, setTags] = useState(profile.tags.join(", "));
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const wanted = tags
		.split(",")
		.map((tag) => tag.trim())
		.filter(Boolean);

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

			<label className="flex flex-col gap-1.5">
				<span className="text-xs text-muted">
					Centres d’intérêt, séparés par des virgules
					<span className="ml-2 tabular-nums">
						{wanted.length} / {MINIMUM_TAGS} minimum
					</span>
				</span>
				<input
					value={tags}
					onChange={(event) => setTags(event.target.value)}
					className={FIELD}
				/>
			</label>

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
			<div className="flex flex-wrap items-center gap-3">
				<label className={`${GHOST} ${busy ? "opacity-60" : ""}`}>
					Ajouter une photo
					<input
						type="file"
						accept="image/jpeg,image/png,image/webp"
						disabled={busy || profile.photos.length >= 5}
						onChange={(event) => {
							const file = event.target.files?.[0];
							event.target.value = "";
							if (file !== undefined) {
								void upload(file);
							}
						}}
						className="hidden"
					/>
				</label>
				<span className="text-xs text-muted">
					{profile.photos.length} / 5 photos
				</span>
			</div>

			{error !== null ? <Alert>{error}</Alert> : null}

			{profile.photos.length === 0 ? (
				<p className="py-10 text-center text-sm text-muted">Aucune photo.</p>
			) : (
				<ul className="flex flex-wrap justify-center gap-2">
					{profile.photos.map((photo) => (
						<li
							key={photo.id}
							className="flex w-[calc((100%-1rem)/3)] flex-col gap-2"
						>
							<div className="relative aspect-square overflow-hidden rounded-lg bg-leaf/40 ring-1 ring-edge/30">
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
										Profil
									</span>
								) : null}
							</div>

							<div className="flex flex-wrap gap-2">
								{photo.is_profile ? null : (
									<button
										type="button"
										disabled={busy}
										onClick={() => void makeProfile(photo.id)}
										className="cursor-pointer text-xs text-matcha underline decoration-matcha/40 underline-offset-4 hover:decoration-matcha disabled:cursor-progress"
									>
										Photo de profil
									</button>
								)}
								<button
									type="button"
									disabled={busy}
									onClick={() => void drop(photo.id, photo.is_profile)}
									className="cursor-pointer text-xs text-muted underline decoration-edge/50 underline-offset-4 hover:text-ink disabled:cursor-progress"
								>
									Supprimer
								</button>
							</div>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}

function Settings({
	profile,
	onChanged,
}: {
	profile: Profile;
	onChanged: () => Promise<void>;
}) {
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [blocked, setBlocked] = useState<BlockedUser[] | null>(null);

	useEffect(() => {
		let live = true;
		void listBlocked().then((result) => {
			if (live) {
				setBlocked(result.ok ? result.data.blocked : []);
			}
		});
		return () => {
			live = false;
		};
	}, []);

	function allow() {
		setError(null);
		if (!("geolocation" in navigator)) {
			setError("Votre navigateur ne donne pas accès à la position.");
			return;
		}
		setBusy(true);
		navigator.geolocation.getCurrentPosition(
			(position) => {
				void saveLocation({
					latitude: position.coords.latitude,
					longitude: position.coords.longitude,
				}).then(async (result) => {
					setBusy(false);
					if (!result.ok) {
						setError(result.errors[0]?.message ?? null);
						return;
					}
					await onChanged();
				});
			},
			() => {
				setBusy(false);
				setError("Position refusée par le navigateur.");
			},
		);
	}

	async function revoke() {
		if (profile.city === null) {
			setError("Choisissez d’abord une ville avant de couper la géolocalisation.");
			return;
		}
		setBusy(true);
		setError(null);
		const result = await saveLocation({ city: profile.city });
		setBusy(false);
		if (!result.ok) {
			setError(result.errors[0]?.message ?? null);
			return;
		}
		await onChanged();
	}

	async function release(id: string) {
		setBusy(true);
		const result = await unblockUser(id);
		setBusy(false);
		if (!result.ok) {
			setError(result.errors[0]?.message ?? null);
			return;
		}
		setBlocked((current) =>
			current === null ? current : current.filter((entry) => entry.id !== id),
		);
	}

	return (
		<div className="flex flex-col gap-8">
			<section className="flex flex-col gap-3">
				<h2 className="text-sm font-semibold">Géolocalisation</h2>
				<p className="text-sm text-muted">
					{profile.location_consent
						? "Votre position exacte est utilisée pour calculer les distances."
						: "Seule votre ville est utilisée. Les distances restent approximatives."}
				</p>
				<p className="text-sm">
					Position enregistrée : {profile.city ?? "aucune"}
					{profile.neighborhood !== null ? `, ${profile.neighborhood}` : ""}
				</p>

				<div className="flex flex-wrap gap-3">
					<button
						type="button"
						disabled={busy}
						onClick={profile.location_consent ? () => void revoke() : allow}
						className={GHOST}
					>
						{profile.location_consent
							? "Ne plus utiliser ma position exacte"
							: "Utiliser ma position exacte"}
					</button>
				</div>

				{error !== null ? <Alert>{error}</Alert> : null}
			</section>

			<section className="flex flex-col gap-3">
				<h2 className="text-sm font-semibold">Comptes bloqués</h2>

				{blocked === null ? (
					<p className="text-sm text-muted">Chargement…</p>
				) : blocked.length === 0 ? (
					<p className="text-sm text-muted">Vous n’avez bloqué personne.</p>
				) : (
					<ul className="flex flex-col divide-y divide-edge/20">
						{blocked.map((entry) => (
							<li key={entry.id} className="flex items-center gap-3 py-3">
								<PresenceAvatar
									url={entry.photo_url}
									name={entry.first_name}
									online={entry.is_online}
									size="small"
								/>
								<span className="min-w-0 flex-1">
									<span className="block truncate text-sm font-medium">
										{entry.first_name}
										<span className="ml-2 font-normal text-muted">
											@{entry.username}
										</span>
									</span>
								</span>
								<button
									type="button"
									disabled={busy}
									onClick={() => void release(entry.id)}
									className={GHOST}
								>
									Débloquer
								</button>
							</li>
						))}
					</ul>
				)}
			</section>
		</div>
	);
}

export function AccountPage() {
	const [profile, setProfile] = useState<Profile | null>(null);
	const [tab, setTab] = useState<"profile" | "photos" | "settings">("profile");
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
			<PrivateScreen width="wide" footer={null}>
				<p className="py-16 text-center text-sm text-muted">Chargement…</p>
			</PrivateScreen>
		);
	}

	const photo = profile.photos.find((entry) => entry.is_profile)
		?? profile.photos[0];

	const tabs = [
		{ key: "profile" as const, label: "Profil" },
		{ key: "photos" as const, label: "Photos" },
		{ key: "settings" as const, label: "Réglages" },
	];

	return (
		<PrivateScreen width="wide" footer={null}>
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
							onClick={() => {
								setEditing(!editing);
								setTab("profile");
							}}
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
					</button>
				))}
			</nav>

			<div className="mt-6">
				{tab === "photos" ? (
					<Photos profile={profile} onChanged={reload} />
				) : tab === "settings" ? (
					<Settings profile={profile} onChanged={reload} />
				) : editing ? (
					<Identity
						profile={profile}
						onSaved={reload}
						onCancel={() => setEditing(false)}
					/>
				) : (
					<p className="py-10 text-center text-sm text-muted">
						« Modifier le profil » pour changer votre nom, votre genre, votre
						biographie ou vos centres d’intérêt.
					</p>
				)}
			</div>
		</PrivateScreen>
	);
}
