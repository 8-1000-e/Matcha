"use client";

import { useState } from "react";
import { Alert } from "@/components/Form/Alert";
import { ActionButton } from "@/components/Form/Button";
import { ProfilePreview } from "@/components/Profile/ProfilePreview";
import type { Profile } from "@/lib/profile/client";
import type { StepProps } from "./StepBase";

const LABELS: Record<string, string> = {
	gender: "Genre et orientation",
	biography: "Biographie",
	tags: "Centres d’intérêt",
	location: "Localisation",
	profile_photo: "Photos",
};

type ReviewProps = {
	steps: readonly {
		key: string;
		title: string;
		Body: (props: StepProps) => React.ReactNode;
	}[];
	profile: Profile;
	onSaved: (profile: Profile) => void;
	onFinish: () => void;
	pending: boolean;
};

function Chevron({ open }: { open: boolean }) {
	return (
		<svg
			viewBox="0 0 16 16"
			aria-hidden="true"
			className={`size-4 transition-transform duration-200 ${
				open ? "rotate-180" : ""
			}`}
			fill="none"
		>
			<path
				d="M4 6.5 8 10.5l4-4"
				stroke="currentColor"
				strokeWidth="1.75"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
}

/**
 * Derniere etape : la fiche prend toute la place et les corrections se font
 * sur place. Renvoyer vers les etapes ferait perdre de vue le rendu, qui est
 * justement ce qu'on vient verifier.
 */
export function ReviewStep({
	steps,
	profile,
	onSaved,
	onFinish,
	pending,
}: ReviewProps) {
	const [open, setOpen] = useState<string | null>(null);

	// On peut vider une section depuis la relecture : sans ce garde-fou, /me
	// renverrait aussitot ici sans dire pourquoi.
	const missing = profile.missing.map((key) => LABELS[key] ?? key);

	return (
		<div className="flex flex-col gap-8">
			<div className="mx-auto w-full max-w-sm">
				<ProfilePreview profile={profile} />
			</div>

			<div className="mx-auto w-full max-w-md">
				<ul className="flex flex-col divide-y divide-edge/25 border-y border-edge/25">
					{steps.map((step) => {
						const expanded = open === step.key;
						const Body = step.Body;

						return (
							<li key={step.key}>
								<button
									type="button"
									onClick={() => setOpen(expanded ? null : step.key)}
									aria-expanded={expanded}
									className="flex w-full cursor-pointer items-center justify-between gap-4 py-3.5 text-left transition-colors duration-200 hover:text-matcha-dark"
								>
									<span className="text-sm font-medium">
										{LABELS[step.key] ?? step.title}
									</span>
									<span className="flex items-center gap-1.5 text-sm text-matcha">
										{expanded ? "Fermer" : "Modifier"}
										<Chevron open={expanded} />
									</span>
								</button>

								{expanded ? (
									<div className="pt-1 pb-6">
										<Body profile={profile} onSaved={onSaved} onNext={() => setOpen(null)} />
									</div>
								) : null}
							</li>
						);
					})}
				</ul>

				<div className="mt-6 flex flex-col gap-3">
					{missing.length > 0 ? (
						<Alert>
							Il reste à compléter : {missing.join(", ")}.
						</Alert>
					) : null}

					<ActionButton
						type="button"
						tone="primary"
						onClick={onFinish}
						disabled={pending || missing.length > 0}
					>
						{pending ? "Un instant…" : "C’est bon, je continue"}
					</ActionButton>
				</div>
			</div>
		</div>
	);
}
