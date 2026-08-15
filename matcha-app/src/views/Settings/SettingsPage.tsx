"use client";

import { useEffect, useState } from "react";
import { Alert } from "@/components/Form/Alert";
import { PrivateScreen } from "@/components/Layout/Screen";
import { PresenceAvatar } from "@/components/Presence/PresenceAvatar";
import {
	listBlocked,
	unblockUser,
	type BlockedUser,
} from "@/lib/moderation/client";
import {
	getProfile,
	saveLocation,
	type Profile,
} from "@/lib/profile/client";

const GHOST
	= "flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-edge bg-white/70 px-3 text-sm font-medium transition-colors duration-200 ease-out hover:bg-leaf/50 disabled:cursor-progress";

function Panel({
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

export function SettingsPage() {
	const [profile, setProfile] = useState<Profile | null>(null);

	async function reload() {
		const result = await getProfile();
		if (result.ok) {
			setProfile(result.data.profile);
		}
	}

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

	return (
		<PrivateScreen
			width="wide"
			title="Réglages"
			intro="Votre géolocalisation et les comptes que vous avez bloqués."
			footer={null}
		>
			{profile === null ? (
				<p className="py-16 text-center text-sm text-muted">Chargement…</p>
			) : (
				<Panel profile={profile} onChanged={reload} />
			)}
		</PrivateScreen>
	);
}
