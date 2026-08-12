import { PrivateScreen } from "@/components/Layout/Screen";

const STEPS = {
	gender: "Votre genre et vos préférences",
	biography: "Une biographie",
	tags: "Au moins trois centres d’intérêt",
	profile_photo: "Une photo de profil",
	location: "Votre localisation",
} as const;

const ORDER = [
	"gender",
	"biography",
	"tags",
	"profile_photo",
	"location",
] as const;

export function CompleteProfilePage({ missing }: { missing: string[] }) {
	return (
		<PrivateScreen
			title="Complétez votre profil"
			intro="Ces informations sont nécessaires avant de voir des profils et d’être vu."
			footer={
				<span className="block text-center">
					{missing.length} élément{missing.length > 1 ? "s" : ""} restant
					{missing.length > 1 ? "s" : ""}.
				</span>
			}
		>
			<ul className="flex flex-col gap-3">
				{ORDER.map((step) => {
					const done = !missing.includes(step);

					return (
						<li
							key={step}
							className={`flex items-center gap-3 rounded-xl border px-4 py-3.5 text-sm ${
								done
									? "border-matcha/30 bg-leaf/40 text-muted"
									: "border-edge bg-white/70"
							}`}
						>
							<svg
								viewBox="0 0 16 16"
								aria-hidden="true"
								className={`size-4 shrink-0 ${done ? "text-matcha" : "text-edge"}`}
								fill="none"
								stroke="currentColor"
								strokeWidth="1.8"
								strokeLinecap="round"
								strokeLinejoin="round"
							>
								{done ? (
									<path d="M3 8.5 6.2 11.7 13 5" />
								) : (
									<circle cx="8" cy="8" r="5.5" />
								)}
							</svg>
							{STEPS[step]}
						</li>
					);
				})}
			</ul>

			<p className="mt-6 text-xs text-muted">
				Les formulaires arrivent avec les routes de profil du back-end.
			</p>
		</PrivateScreen>
	);
}
