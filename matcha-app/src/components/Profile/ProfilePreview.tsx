import { MatchaBowl } from "@/components/Brand/Brand";
import type { Profile } from "@/lib/profile/client";

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
	pan: "Pan",
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

function Pending({ children }: { children: string }) {
	return <span className="text-muted/60 italic">{children}</span>;
}

export function ProfilePreview({ profile }: { profile: Profile }) {
	const cover = profile.photos.find((photo) => photo.is_profile);
	const place = [profile.city, profile.neighborhood].filter(Boolean).join(" · ");
	const meta = [
		profile.gender ? GENDERS[profile.gender] : null,
		ORIENTATIONS[profile.orientation],
	].filter((entry): entry is string => entry !== null);

	return (
		<article className="overflow-hidden rounded-3xl bg-white shadow-[0_1px_2px_rgba(38,48,28,0.04),0_12px_32px_-12px_rgba(38,48,28,0.18)] ring-1 ring-matcha/10">
			<div className="relative aspect-square w-full bg-leaf/30">
				{cover ? (
					// eslint-disable-next-line @next/next/no-img-element
					<img src={cover.url} alt="" className="size-full object-cover" />
				) : (
					<div className="flex size-full flex-col items-center justify-center gap-2.5 text-muted">
						<span className="flex size-14 items-center justify-center rounded-full bg-white/70 ring-1 ring-matcha/10">
							<MatchaBowl className="size-8 opacity-40" />
						</span>
						<span className="text-xs">Votre photo ira ici</span>
					</div>
				)}

				{/* Sur une fiche de rencontre, l'image porte l'identite : le reste
				    vient par-dessus plutot qu'en dessous. */}
				<div className="absolute top-3 right-3 flex flex-wrap justify-end gap-1">
					{meta.map((entry) => (
						<span
							key={entry}
							className="rounded-full bg-white/85 px-2.5 py-1 text-[11px] font-medium text-ink backdrop-blur-sm"
						>
							{entry}
						</span>
					))}
				</div>

				<div className={`absolute inset-x-0 bottom-0 ${cover ? "bg-linear-to-t from-ink/80 via-ink/45 to-transparent" : "bg-linear-to-t from-ink/55 to-transparent"} px-4 pt-12 pb-3.5 text-white`}>
					<h2 className="flex items-baseline gap-2 text-xl leading-tight font-semibold tracking-tight">
						<span className="truncate">{profile.first_name}</span>
						<span className="font-normal opacity-90">
							{age(profile.birth_date)}
						</span>
					</h2>
					<p className="mt-1 flex items-center gap-1.5 text-sm opacity-90">
						<svg viewBox="0 0 16 16" className="size-3.5 shrink-0" fill="none">
							<path
								d="M8 14s5-4.2 5-8A5 5 0 0 0 3 6c0 3.8 5 8 5 8Z"
								stroke="currentColor"
								strokeWidth="1.5"
							/>
							<circle cx="8" cy="6" r="1.75" fill="currentColor" />
						</svg>
						{place || "Localisation à venir"}
					</p>
				</div>
			</div>

			<div className="flex flex-col gap-3 p-4">
				<p className="text-sm leading-relaxed">
					{profile.biography || <Pending>Biographie à venir</Pending>}
				</p>

				{profile.tags.length > 0 ? (
					<ul className="flex flex-wrap gap-1.5">
						{profile.tags.map((tag) => (
							<li
								key={tag}
								className="rounded-full bg-leaf/55 px-2.5 py-1 text-xs font-medium text-matcha-dark"
							>
								#{tag}
							</li>
						))}
					</ul>
				) : (
					<p className="text-sm">
						<Pending>Centres d’intérêt à venir</Pending>
					</p>
				)}

			</div>
		</article>
	);
}
