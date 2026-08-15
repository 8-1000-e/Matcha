"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MatchaBowl } from "@/components/Brand/Brand";
import { Alert } from "@/components/Form/Alert";
import { ActionButton } from "@/components/Form/Button";
import { PrivateScreen } from "@/components/Layout/Screen";
import { PresenceAvatar } from "@/components/Presence/PresenceAvatar";
import type { CurrentUser } from "@/lib/auth/api";
import {
	getProfile,
	saveProfile,
	type Gender,
	type Orientation,
	type Profile,
} from "@/lib/profile/client";
import { fetchViews, type ProfileView } from "@/lib/profile/views";

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

function when(iso: string) {
	return new Date(iso).toLocaleDateString("fr-FR", {
		day: "numeric",
		month: "short",
		hour: "2-digit",
		minute: "2-digit",
	});
}

function Editor({
	profile,
	onSaved,
}: {
	profile: Profile;
	onSaved: (next: Profile) => void;
}) {
	const [biography, setBiography] = useState(profile.biography ?? "");
	const [gender, setGender] = useState<Gender | "">(profile.gender ?? "");
	const [orientation, setOrientation] = useState<Orientation>(
		profile.orientation,
	);
	const [firstName, setFirstName] = useState(profile.first_name);
	const [lastName, setLastName] = useState(profile.last_name);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [saved, setSaved] = useState(false);

	async function submit(event: React.FormEvent) {
		event.preventDefault();
		setBusy(true);
		setError(null);
		setSaved(false);

		const result = await saveProfile({
			first_name: firstName,
			last_name: lastName,
			biography,
			orientation,
			...(gender === "" ? {} : { gender }),
		});
		setBusy(false);

		if (!result.ok) {
			setError(result.errors[0]?.message ?? null);
			return;
		}

		setSaved(true);
		onSaved(result.data.profile);
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
						onChange={(event) =>
							setOrientation(event.target.value as Orientation)}
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

			{error !== null ? <Alert>{error}</Alert> : null}

			<div className="flex items-center gap-4">
				<div className="w-44">
					<ActionButton type="submit" tone="primary" busy={busy}>
						Enregistrer
					</ActionButton>
				</div>
				{saved ? (
					<span className="text-sm text-matcha">Profil mis à jour.</span>
				) : null}
			</div>
		</form>
	);
}

function Visitors() {
	const [views, setViews] = useState<ProfileView[] | null>(null);

	useEffect(() => {
		let live = true;
		void fetchViews("received").then((result) => {
			if (live && result.ok) {
				setViews(result.data.views);
			}
		});
		return () => {
			live = false;
		};
	}, []);

	if (views === null) {
		return <p className="py-10 text-center text-sm text-muted">Chargement…</p>;
	}

	if (views.length === 0) {
		return (
			<p className="py-10 text-center text-sm text-muted">
				Personne n’a encore consulté votre profil.
			</p>
		);
	}

	return (
		<ul className="flex flex-col divide-y divide-edge/20">
			{views.map((view) => (
				<li key={view.id}>
					<Link
						href={`/users/${view.id}`}
						className="flex items-center gap-3 py-3 transition-colors duration-200 ease-out hover:bg-leaf/30"
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
								<span className="ml-2 font-normal text-muted">
									@{view.username}
								</span>
							</span>
							<span className="block text-xs text-muted">
								{view.city ?? "Ville inconnue"} · {when(view.viewed_at)}
								{view.visit_count !== undefined && view.visit_count > 1
									? ` · ${view.visit_count} visites`
									: ""}
							</span>
						</span>
					</Link>
				</li>
			))}
		</ul>
	);
}

export function AccountPage({ user }: { user: CurrentUser }) {
	const [profile, setProfile] = useState<Profile | null>(null);
	const [tab, setTab] = useState<"profile" | "visitors">("profile");

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

	const photo = profile?.photos.find((entry) => entry.is_profile)
		?? profile?.photos[0];

	const tabs = [
		{ key: "profile" as const, label: "Mon profil" },
		{ key: "visitors" as const, label: "Visites" },
	];

	return (
		<PrivateScreen width="wide" footer={null}>
			<header className="flex items-center gap-5 sm:gap-8">
				<div className="relative size-24 shrink-0 overflow-hidden rounded-full bg-leaf/50 ring-2 ring-matcha sm:size-28">
					{photo === undefined ? (
						<span className="flex size-full items-center justify-center">
							<MatchaBowl className="size-10 opacity-25" />
						</span>
					) : (
						/* eslint-disable-next-line @next/next/no-img-element */
						<img src={photo.url} alt="" className="size-full object-cover" />
					)}
				</div>

				<div className="min-w-0">
					<h1 className="truncate text-xl font-semibold tracking-tight">
						@{user.username}
					</h1>
					<p className="mt-1 text-sm">
						{user.first_name} {user.last_name}
					</p>
					<p className="mt-1 text-sm text-muted">
						{profile?.city ?? "Ville inconnue"}
						{profile !== null && profile.tags.length > 0
							? ` · ${profile.tags.length} centres d’intérêt`
							: ""}
					</p>
					<Link
						href="/complete-profile"
						className="mt-2 inline-block text-sm text-matcha underline decoration-matcha/40 underline-offset-4 hover:decoration-matcha"
					>
						Gérer mes photos et ma localisation
					</Link>
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
				{tab === "visitors" ? (
					<Visitors />
				) : profile === null ? (
					<p className="py-10 text-center text-sm text-muted">Chargement…</p>
				) : (
					<Editor profile={profile} onSaved={setProfile} />
				)}
			</div>
		</PrivateScreen>
	);
}
