"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { GoogleIcon, Intra42Icon } from "@/components/Brand/ProviderLogos";
import { Alert } from "@/components/Form/Alert";
import { Notice } from "@/components/Form/Notice";
import { Footer } from "@/components/Layout/Footer";
import { PrivateScreen } from "@/components/Layout/Screen";
import { PresenceAvatar } from "@/components/Presence/PresenceAvatar";
import type { AuthError } from "@/lib/auth/errorMessages";
import {
	listBlocked,
	unblockUser,
	type BlockedUser,
} from "@/lib/moderation/client";
import {
	fetchLinkedAccounts,
	unlinkAccount,
	type LinkedAccount,
} from "@/lib/oauth/client";
import type { OauthFeedback } from "@/lib/oauth/messages";
import {
	changePassword,
	deleteAccount,
	getProfile,
	saveLocation,
	saveProfile,
	setLocationConsent,
	type Place,
	type Profile,
} from "@/lib/profile/client";
import { syncDue } from "@/lib/profile/locationSync";
import { CityPicker } from "@/views/CompleteProfile/CityPicker";
import { Errors } from "@/views/CompleteProfile/StepBase";

const GHOST
	= "flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-edge bg-white/70 px-3 text-sm font-medium transition-colors duration-200 ease-out hover:bg-leaf/50 disabled:cursor-progress";

const PRIMARY
	= "flex h-9 cursor-pointer items-center gap-2 rounded-lg bg-matcha px-4 text-sm font-medium text-white transition-colors duration-200 ease-out hover:bg-matcha-dark disabled:cursor-progress";

const SECTIONS = [
	{ key: "location" as const, label: "Localisation" },
	{ key: "connections" as const, label: "Connexions" },
	{ key: "blocked" as const, label: "Comptes bloqués" },
	{ key: "account" as const, label: "Compte" },
];

const OAUTH_PROVIDERS = [
	{ id: "42", name: "Intra 42", Icon: Intra42Icon },
	{ id: "google", name: "Google", Icon: GoogleIcon },
];

type Section = (typeof SECTIONS)[number]["key"];

const FILENAME_RE = /filename="([^"]+)"/;

function fileNameFrom(response: Response): string | null {
	const header = response.headers.get("content-disposition") ?? "";
	const found = FILENAME_RE.exec(header);

	return found === null ? null : found[1];
}

function when(iso: string) {
	return new Date(iso).toLocaleDateString("fr-FR", {
		day: "numeric",
		month: "long",
		hour: "2-digit",
		minute: "2-digit",
	});
}

function Card({
	title,
	description,
	children,
}: {
	title: string;
	description: string;
	children: React.ReactNode;
}) {
	return (
		<section className="rounded-2xl border border-edge/40 bg-white/50 p-5">
			<h2 className="text-sm font-semibold">{title}</h2>
			<p className="mt-1 text-sm text-muted">{description}</p>
			<div className="mt-4">{children}</div>
		</section>
	);
}

function Location({
	profile,
	onChanged,
}: {
	profile: Profile;
	onChanged: () => Promise<void>;
}) {
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);

	function locate(consent: boolean) {
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
				setError(
					consent
						? "Position refusée par le navigateur."
						: "Position refusée : votre ville reste utilisée.",
				);
			},
		);
	}

	async function stopTracking() {
		setBusy(true);
		setError(null);
		const result = await setLocationConsent(false);
		setBusy(false);
		if (!result.ok) {
			setError(result.errors[0]?.message ?? null);
			return;
		}
		await onChanged();
	}

	async function pickCity(place: Place | null) {
		if (place === null) {
			return;
		}
		setBusy(true);
		setError(null);
		const result = await saveLocation({
			city: place.city,
			neighborhood: place.neighborhood,
			latitude: place.latitude,
			longitude: place.longitude,
		});
		setBusy(false);
		if (!result.ok) {
			setError(result.errors[0]?.message ?? null);
			return;
		}
		await onChanged();
	}

	return (
		<div className="flex flex-col gap-6">
			<Card
				title="Suivi de position"
				description={
					profile.location_consent
						? "Votre position est rafraîchie automatiquement une fois par jour, à l’ouverture de l’application."
						: "Le suivi est désactivé. Seule la ville que vous avez choisie est utilisée, elle ne change jamais toute seule."
				}
			>
				<div className="flex flex-col gap-4">
					<dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
						<div className="flex gap-2">
							<dt className="text-muted">État</dt>
							<dd className="font-medium">
								{profile.location_consent ? "Suivi actif" : "Ville fixe"}
							</dd>
						</div>
						<div className="flex gap-2">
							<dt className="text-muted">Position</dt>
							<dd className="font-medium">
								{profile.city ?? "Inconnue"}
								{profile.neighborhood !== null ? `, ${profile.neighborhood}` : ""}
							</dd>
						</div>
						{profile.location_consent ? (
							<div className="flex gap-2">
								<dt className="text-muted">Dernier relevé</dt>
								<dd className="font-medium">
									{profile.location_updated_at === null
										? "jamais"
										: when(profile.location_updated_at)}
									{syncDue(profile.location_updated_at) ? " · à rafraîchir" : ""}
								</dd>
							</div>
						) : null}
					</dl>

					{profile.location_consent ? (
						<div className="flex flex-wrap gap-3">
							<button
								type="button"
								disabled={busy}
								onClick={() => locate(true)}
								className={GHOST}
							>
								Relever ma position maintenant
							</button>
							<button
								type="button"
								disabled={busy}
								onClick={() => void stopTracking()}
								className={GHOST}
							>
								Désactiver le suivi
							</button>
						</div>
					) : (
						<div className="flex flex-wrap gap-3">
							<button
								type="button"
								disabled={busy}
								onClick={() => locate(false)}
								className={PRIMARY}
							>
								Activer le suivi quotidien
							</button>
						</div>
					)}

					{error !== null ? <Alert>{error}</Alert> : null}
				</div>
			</Card>

			<Card
				title="Ma ville"
				description="Utilisée quand le suivi est désactivé, et comme repli si la position du navigateur n’est pas disponible."
			>
				<CityPicker defaultValue={profile.city ?? ""} onPick={pickCity} />
			</Card>
		</div>
	);
}

function Blocked() {
	const [blocked, setBlocked] = useState<BlockedUser[] | null>(null);
	const [busy, setBusy] = useState(false);

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

	async function release(id: string) {
		setBusy(true);
		const result = await unblockUser(id);
		setBusy(false);
		if (!result.ok) {
			return;
		}
		setBlocked((current) =>
			current === null ? current : current.filter((entry) => entry.id !== id),
		);
	}

	return (
		<Card
			title="Comptes bloqués"
			description="Ces personnes ne voient plus votre profil et n’apparaissent plus dans vos suggestions."
		>
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
		</Card>
	);
}

function EmailForm({
	profile,
	onSaved,
}: {
	profile: Profile;
	onSaved: () => void;
}) {
	const [open, setOpen] = useState(false);
	const [email, setEmail] = useState(profile.email);
	const [errors, setErrors] = useState<AuthError[]>([]);
	const [sent, setSent] = useState(false);
	const [pending, setPending] = useState(false);

	function start() {
		setEmail(profile.email);
		setErrors([]);
		setSent(false);
		setOpen(true);
	}

	async function submit(event: React.FormEvent) {
		event.preventDefault();
		setErrors([]);
		setPending(true);

		const result = await saveProfile({ email: email.trim().toLowerCase() });
		setPending(false);

		if (!result.ok) {
			setErrors(result.errors);
			return;
		}

		setOpen(false);
		setSent(true);
		onSaved();
	}

	if (!open) {
		return (
			<div className="flex flex-col gap-2">
				<button type="button" className={GHOST} onClick={start}>
					Changer d’adresse e-mail
				</button>
				{sent ? (
					<p className="text-xs text-muted">
						Un lien de vérification vient d’être envoyé à votre nouvelle adresse.
					</p>
				) : null}
			</div>
		);
	}

	return (
		<form onSubmit={(event) => void submit(event)} className="flex flex-col gap-3">
			<p className="rounded-lg bg-leaf/40 px-3 py-2 text-xs text-ink">
				Changer d’adresse suspend la vérification de votre compte : vous devrez
				cliquer sur le lien envoyé à la nouvelle adresse avant de pouvoir
				réutiliser Brewmance.
			</p>

			<label className="flex flex-col gap-1.5">
				<span className="text-xs text-muted">Nouvelle adresse e-mail</span>
				<input
					type="email"
					required
					autoComplete="email"
					value={email}
					onChange={(event) => setEmail(event.target.value)}
					className="min-h-10 w-full rounded-lg border border-edge/60 bg-white px-3 text-sm transition-colors duration-200 ease-out hover:border-matcha/60 focus-visible:border-matcha"
				/>
			</label>

			<Errors errors={errors} />

			<div className="flex gap-2">
				<button
					type="submit"
					className={PRIMARY}
					disabled={pending || email.trim().toLowerCase() === profile.email}
				>
					Envoyer le lien
				</button>
				<button type="button" className={GHOST} onClick={() => setOpen(false)}>
					Annuler
				</button>
			</div>
		</form>
	);
}

function Connections() {
	const [accounts, setAccounts] = useState<LinkedAccount[] | null>(null);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [done, setDone] = useState<string | null>(null);

	useEffect(() => {
		let live = true;
		void fetchLinkedAccounts().then((result) => {
			if (live) {
				setAccounts(result.ok ? result.data.accounts : []);
			}
		});
		return () => {
			live = false;
		};
	}, []);

	async function unlink(provider: string) {
		setBusy(true);
		setError(null);
		setDone(null);
		const result = await unlinkAccount(provider);
		setBusy(false);
		if (!result.ok) {
			setError(result.errors[0]?.message ?? null);
			return;
		}
		setAccounts((current) =>
			current === null ? current : current.filter((entry) => entry.provider !== provider),
		);
		setDone(provider === "42" ? "Compte Intra 42 délié." : "Compte Google délié.");
	}

	return (
		<Card
			title="Connexions"
			description="Reliez un compte pour vous connecter en un clic, sans mot de passe."
		>
			{accounts === null ? (
				<p className="text-sm text-muted">Chargement…</p>
			) : (
				<ul className="flex flex-col divide-y divide-edge/20">
					{OAUTH_PROVIDERS.map(({ id, name, Icon }) => {
						const linked = accounts.find((entry) => entry.provider === id);
						return (
							<li key={id} className="flex items-center gap-3 py-3">
								<Icon className="size-5 shrink-0" />

								<span className="min-w-0 flex-1">
									<span className="block text-sm font-medium">{name}</span>
									<span className="block truncate text-xs text-muted">
										{linked === undefined
											? "Aucun compte relié"
											: (linked.email ?? "Compte relié")}
									</span>
								</span>

								{linked === undefined ? (
									<a href={`/api/auth/${id}/start?mode=link`} className={GHOST}>
										Relier
									</a>
								) : (
									<button
										type="button"
										disabled={busy}
										onClick={() => void unlink(id)}
										className="flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-red-200 bg-white/70 px-3 text-sm font-medium text-red-700 transition-colors duration-200 ease-out hover:bg-red-50 disabled:cursor-progress"
									>
										Délier
									</button>
								)}
							</li>
						);
					})}
				</ul>
			)}

			{error !== null ? <Alert>{error}</Alert> : null}
			{done !== null ? <Notice>{done}</Notice> : null}
		</Card>
	);
}

function ExportData() {
	const [pending, setPending] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function download() {
		setPending(true);
		setError(null);

		const response = await fetch("/api/profile/export", {
			credentials: "same-origin",
		});
		if (!response.ok) {
			setPending(false);
			setError("L’export a échoué, réessayez.");
			return;
		}

		const blob = await response.blob();
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = fileNameFrom(response) ?? "matcha-donnees.json";
		document.body.append(link);
		link.click();
		link.remove();
		URL.revokeObjectURL(url);
		setPending(false);
	}

	return (
		<div>
			<h3 className="text-sm font-medium">Mes données</h3>
			<p className="mt-1 text-sm text-muted">
				Téléchargez tout ce que Matcha conserve sur vous, au format JSON :
				profil, photos, likes, visites, conversations, rendez-vous, avis,
				signalements et sessions.
			</p>

			{error !== null ? (
				<div className="mt-3">
					<Alert>{error}</Alert>
				</div>
			) : null}

			<button
				type="button"
				className={`${GHOST} mt-3`}
				disabled={pending}
				onClick={() => void download()}
			>
				{pending ? "Préparation…" : "Exporter mes données"}
			</button>
		</div>
	);
}

function Account({
	profile,
	onSaved,
}: {
	profile: Profile;
	onSaved: () => void;
}) {
	return (
		<Card
			title="Compte"
			description="Les informations liées à votre connexion."
		>
			<dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
				<div className="flex gap-2">
					<dt className="text-muted">Nom d’utilisateur</dt>
					<dd className="font-medium">@{profile.username}</dd>
				</div>
				<div className="flex gap-2">
					<dt className="text-muted">Adresse e-mail</dt>
					<dd className="font-medium">{profile.email}</dd>
				</div>
				<div className="flex gap-2">
					<dt className="text-muted">Vérification</dt>
					<dd className="font-medium text-matcha">
						{profile.is_verified ? "vérifiée" : "en attente"}
					</dd>
				</div>
				<div className="flex gap-2">
					<dt className="text-muted">Profil</dt>
					<dd className="font-medium text-matcha">
						{profile.missing.length === 0
							? "complet"
							: `${profile.missing.length} champ(s) manquant(s)`}
					</dd>
				</div>
			</dl>

			<div className="mt-5 border-t border-edge/30 pt-4">
				<EmailForm profile={profile} onSaved={onSaved} />
			</div>

			<div className="mt-5 border-t border-edge/30 pt-4">
				<PasswordForm />
			</div>

			<div className="mt-5 border-t border-edge/30 pt-4">
				<ExportData />
			</div>

			<div className="mt-5 border-t border-edge/30 pt-4">
				<DeleteAccount />
			</div>
		</Card>
	);
}

const FIELD
	= "min-h-10 w-full rounded-lg border border-edge/60 bg-white px-3 text-sm"
	+ " transition-colors duration-200 ease-out hover:border-matcha/60"
	+ " focus-visible:border-matcha";

function PasswordForm() {
	const [open, setOpen] = useState(false);
	const [current, setCurrent] = useState("");
	const [password, setPassword] = useState("");
	const [confirm, setConfirm] = useState("");
	const [errors, setErrors] = useState<AuthError[]>([]);
	const [done, setDone] = useState(false);
	const [pending, setPending] = useState(false);

	function close() {
		setCurrent("");
		setPassword("");
		setConfirm("");
		setErrors([]);
		setOpen(false);
	}

	async function submit(event: React.FormEvent) {
		event.preventDefault();
		setDone(false);

		if (password !== confirm) {
			setErrors([{ field: null, message: "Les deux mots de passe diffèrent." }]);
			return;
		}

		setErrors([]);
		setPending(true);
		const result = await changePassword(current, password);
		setPending(false);

		if (!result.ok) {
			setErrors(result.errors);
			return;
		}

		close();
		setDone(true);
	}

	if (!open) {
		return (
			<div className="flex flex-col gap-2">
				<button
					type="button"
					className={GHOST}
					onClick={() => {
						setDone(false);
						setOpen(true);
					}}
				>
					Changer de mot de passe
				</button>
				{done ? (
					<p className="text-xs text-muted">
						Mot de passe modifié. Vos autres appareils ont été déconnectés.
					</p>
				) : null}
			</div>
		);
	}

	return (
		<form onSubmit={(event) => void submit(event)} className="flex flex-col gap-3">
			<p className="rounded-lg bg-leaf/40 px-3 py-2 text-xs text-ink">
				Changer de mot de passe déconnecte vos autres appareils. Celui-ci reste
				connecté.
			</p>

			<label className="flex flex-col gap-1.5">
				<span className="text-xs text-muted">Mot de passe actuel</span>
				<input
					type="password"
					required
					autoComplete="current-password"
					value={current}
					onChange={(event) => setCurrent(event.target.value)}
					className={FIELD}
				/>
			</label>

			<label className="flex flex-col gap-1.5">
				<span className="text-xs text-muted">Nouveau mot de passe</span>
				<input
					type="password"
					required
					autoComplete="new-password"
					value={password}
					onChange={(event) => setPassword(event.target.value)}
					className={FIELD}
				/>
			</label>

			<label className="flex flex-col gap-1.5">
				<span className="text-xs text-muted">Confirmer le nouveau</span>
				<input
					type="password"
					required
					autoComplete="new-password"
					value={confirm}
					onChange={(event) => setConfirm(event.target.value)}
					className={FIELD}
				/>
			</label>

			<Errors errors={errors} />

			<div className="flex gap-2">
				<button
					type="submit"
					className={PRIMARY}
					disabled={
						pending
						|| current.length === 0
						|| password.length === 0
						|| confirm.length === 0
					}
				>
					Enregistrer
				</button>
				<button type="button" className={GHOST} onClick={close}>
					Annuler
				</button>
			</div>
		</form>
	);
}

function DeleteAccount() {
	const router = useRouter();
	const [open, setOpen] = useState(false);
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [pending, setPending] = useState(false);

	async function submit(event: React.FormEvent) {
		event.preventDefault();
		setError(null);
		setPending(true);

		const result = await deleteAccount(password);
		if (!result.ok) {
			setPending(false);
			setError(result.errors[0]?.message ?? "Suppression impossible.");
			return;
		}

		router.replace("/account-deleted");
		router.refresh();
	}

	if (!open) {
		return (
			<div className="flex flex-col gap-2">
				<button
					type="button"
					className="flex h-9 w-fit cursor-pointer items-center gap-2 rounded-lg border border-red-300 bg-white/70 px-3 text-sm font-medium text-red-700 transition-colors duration-200 ease-out hover:bg-red-50"
					onClick={() => {
						setPassword("");
						setError(null);
						setOpen(true);
					}}
				>
					Supprimer mon compte
				</button>
				<p className="text-xs text-muted">
					Votre profil disparaît immédiatement. Vos données sont conservées 14
					jours, le temps de changer d’avis, puis effacées définitivement.
				</p>
			</div>
		);
	}

	return (
		<form onSubmit={(event) => void submit(event)} className="flex flex-col gap-3">
			<p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-800">
				Votre profil, vos photos, vos likes, vos visites, vos avis et vos
				conversations seront effacés le quatorzième jour. Passé ce délai, rien
				n’est récupérable.
			</p>

			<label className="flex flex-col gap-1.5">
				<span className="text-xs text-muted">
					Confirmez avec votre mot de passe
				</span>
				<input
					type="password"
					required
					autoComplete="current-password"
					value={password}
					onChange={(event) => setPassword(event.target.value)}
					className="min-h-10 w-full rounded-lg border border-edge/60 bg-white px-3 text-sm transition-colors duration-200 ease-out hover:border-matcha/60 focus-visible:border-matcha"
				/>
			</label>

			{error !== null ? <Alert>{error}</Alert> : null}

			<div className="flex gap-2">
				<button
					type="submit"
					disabled={pending || password.length === 0}
					className="flex h-9 cursor-pointer items-center rounded-lg bg-red-700 px-4 text-sm font-medium text-white transition-colors duration-200 ease-out hover:bg-red-800 disabled:cursor-progress disabled:opacity-60"
				>
					Supprimer définitivement
				</button>
				<button type="button" className={GHOST} onClick={() => setOpen(false)}>
					Annuler
				</button>
			</div>
		</form>
	);
}

export function SettingsPage({ oauthMessage }: { oauthMessage?: OauthFeedback }) {
	const [profile, setProfile] = useState<Profile | null>(null);
	const [section, setSection] = useState<Section>(
		oauthMessage === undefined ? "location" : "connections",
	);

	useEffect(() => {
		if (oauthMessage === undefined) {
			return;
		}
		const url = new URL(window.location.href);
		url.searchParams.delete("oauth");
		window.history.replaceState(null, "", url.toString());
	}, [oauthMessage]);

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
			intro="Votre position, les comptes que vous avez bloqués et les informations de votre compte."
			footer={<Footer />}
		>
			{profile === null ? (
				<p className="py-16 text-center text-sm text-muted">Chargement…</p>
			) : (
				<div className="grid gap-6 md:grid-cols-[12rem_1fr]">
					<nav className="flex gap-2 overflow-x-auto md:flex-col md:overflow-visible">
						{SECTIONS.map((entry) => (
							<button
								key={entry.key}
								type="button"
								onClick={() => setSection(entry.key)}
								aria-current={section === entry.key}
								className={`shrink-0 cursor-pointer rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors duration-200 ease-out ${
									section === entry.key
										? "bg-leaf/60 text-matcha-dark"
										: "text-muted hover:bg-leaf/30 hover:text-ink"
								}`}
							>
								{entry.label}
							</button>
						))}
					</nav>

					<div>
						{oauthMessage !== undefined && section === "connections" ? (
							<div className="mb-4">
								{oauthMessage.tone === "success" ? (
									<Notice>{oauthMessage.text}</Notice>
								) : (
									<Alert>{oauthMessage.text}</Alert>
								)}
							</div>
						) : null}

						{section === "location" ? (
							<Location profile={profile} onChanged={reload} />
						) : section === "connections" ? (
							<Connections />
						) : section === "blocked" ? (
							<Blocked />
						) : (
							<Account profile={profile} onSaved={() => void reload()} />
						)}
					</div>
				</div>
			)}
		</PrivateScreen>
	);
}
