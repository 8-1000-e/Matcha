import { MatchaBowl } from "@/components/Brand/Brand";
import type { Profile } from "@/lib/profile/client";

const GENDERS: Record<string, string> = {
	woman: "Femme",
	man: "Homme",
	non_binary: "Non-binaire",
	other: "Autre",
};

const ORIENTATIONS: Record<string, string> = {
	hetero: "Hétérosexuel·le",
	homo: "Homosexuel·le",
	bi: "Bisexuel·le",
	pan: "Pansexuel·le",
	other: "Autre",
};

function age(birthDate: string) {
	const born = new Date(`${birthDate}T00:00:00Z`);
	const now = new Date();
	let years = now.getUTCFullYear() - born.getUTCFullYear();
	const month = now.getUTCMonth() - born.getUTCMonth();
	if (month < 0 || (month === 0 && now.getUTCDate() < born.getUTCDate()))
	{
		years -= 1;
	}
	return years;
}

/** Marque ce qui n'est pas encore rempli, sans casser la lecture. */
function Pending({ children }: { children: string }) {
	return (
		<span className="text-muted/70 italic">{children}</span>
	);
}

export function ProfilePreview({ profile }: { profile: Profile }) {
	const cover = profile.photos.find((photo) => photo.is_profile);
	const others = profile.photos.filter((photo) => !photo.is_profile);
	const place = [profile.city, profile.neighborhood].filter(Boolean).join(" · ");

	return (
		<article className="overflow-hidden rounded-3xl bg-white/70 ring-1 ring-matcha/15 backdrop-blur-sm">
			<div className="relative aspect-4/5 w-full bg-leaf/40">
				{cover ? (
					// Photo locale servie depuis /uploads : next/image n'apporterait
					// rien ici et exigerait une configuration de domaines.
					// eslint-disable-next-line @next/next/no-img-element
					<img
						src={cover.url}
						alt=""
						className="size-full object-cover"
					/>
				) : (
					<div className="flex size-full flex-col items-center justify-center gap-3 text-muted">
						<MatchaBowl className="size-10 opacity-40" />
						<span className="text-xs">Aucune photo de profil</span>
					</div>
				)}

				<div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-ink/70 to-transparent p-5 pt-12 text-white">
					<h2 className="text-xl font-semibold tracking-tight">
						{profile.first_name} {profile.last_name}
						<span className="ml-2 font-normal opacity-90">
							{age(profile.birth_date)}
						</span>
					</h2>
					<p className="mt-0.5 text-sm opacity-90">
						{place || "Localisation à définir"}
					</p>
				</div>
			</div>

			<div className="flex flex-col gap-5 p-5">
				<p className="text-sm leading-relaxed">
					{profile.biography || <Pending>Votre biographie apparaîtra ici.</Pending>}
				</p>

				<div className="flex flex-wrap gap-1.5">
					{profile.tags.length > 0 ? (
						profile.tags.map((tag) => (
							<span
								key={tag}
								className="rounded-full bg-leaf/60 px-2.5 py-1 text-xs font-medium text-matcha-dark"
							>
								#{tag}
							</span>
						))
					) : (
						<Pending>Vos centres d’intérêt apparaîtront ici.</Pending>
					)}
				</div>

				{others.length > 0 ? (
					<ul className="flex gap-2">
						{others.map((photo) => (
							<li key={photo.id} className="size-14 overflow-hidden rounded-xl">
								{/* eslint-disable-next-line @next/next/no-img-element */}
								<img src={photo.url} alt="" className="size-full object-cover" />
							</li>
						))}
					</ul>
				) : null}

				<dl className="flex flex-wrap gap-x-6 gap-y-2 border-t border-edge/25 pt-4 text-xs">
					<div className="flex gap-1.5">
						<dt className="text-muted">Genre</dt>
						<dd className="font-medium">
							{profile.gender ? GENDERS[profile.gender] : <Pending>à définir</Pending>}
						</dd>
					</div>
					<div className="flex gap-1.5">
						<dt className="text-muted">Recherche</dt>
						<dd className="font-medium">{ORIENTATIONS[profile.orientation]}</dd>
					</div>
				</dl>
			</div>
		</article>
	);
}
