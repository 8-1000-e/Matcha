"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { PrivateScreen } from "@/components/Layout/Screen";
import { ProfilePreview } from "@/components/Profile/ProfilePreview";
import { Stepper, StepperItem } from "@/components/Stepper/Stepper";
import type { Profile } from "@/lib/profile/client";
import { AboutStep } from "./AboutStep";
import { BiographyStep } from "./BiographyStep";
import { LocationStep } from "./LocationStep";
import { PhotosStep } from "./PhotosStep";
import { ReviewStep } from "./ReviewStep";
import type { StepProps } from "./StepBase";
import { TagsStep } from "./TagsStep";

type Step = {
	key: string;
	label: string;
	title: string;
	intro: string;
	Body: (props: StepProps) => React.ReactNode;
};

const STEPS: readonly Step[] = [
	{
		key: "gender",
		label: "Vous",
		title: "Qui êtes-vous ?",
		intro: "Ces deux réponses déterminent les profils qui vous seront proposés.",
		Body: AboutStep,
	},
	{
		key: "biography",
		label: "Biographie",
		title: "Présentez-vous",
		intro: "Quelques lignes suffisent, elles seront visibles sur votre profil.",
		Body: BiographyStep,
	},
	{
		key: "tags",
		label: "Centres d’intérêt",
		title: "Ce que vous aimez",
		intro: "Les centres d’intérêt partagés font remonter les profils proches.",
		Body: TagsStep,
	},
	{
		key: "location",
		label: "Localisation",
		title: "Où êtes-vous ?",
		intro: "La proximité compte autant que les affinités.",
		Body: LocationStep,
	},
	{
		key: "profile_photo",
		label: "Photos",
		title: "Vos photos",
		intro: "Une photo de profil est nécessaire pour aimer et être aimé.",
		Body: PhotosStep,
	},
];

const REVIEW = STEPS.length;

function firstMissing(missing: string[]) {
	const index = STEPS.findIndex((step) => missing.includes(step.key));
	return index === -1 ? REVIEW : index;
}

export function CompleteProfilePage({ initial }: { initial: Profile }) {
	const router = useRouter();
	const [profile, setProfile] = useState(initial);
	const [index, setIndex] = useState(() => firstMissing(initial.missing));
	const [leaving, startLeaving] = useTransition();

	const reviewing = index === REVIEW;
	const step = reviewing ? null : STEPS[index];
	// Une balise JSX exige un identifiant capitalise : on ne peut pas ecrire
	// <step.Body /> directement.
	const StepBody = step?.Body;

	function handleSaved(next: Profile) {
		setProfile(next);

		// On avance vers ce qui manque encore, ou vers la relecture si tout est
		// rempli. On ne quitte jamais la page tout seul : la derniere etape
		// existe justement pour laisser corriger avant de valider.
		if (step && !next.missing.includes(step.key))
		{
			setIndex(firstMissing(next.missing));
		}
	}

	function finish() {
		startLeaving(() => {
			router.push("/me");
			router.refresh();
		});
	}

	return (
		<PrivateScreen
			width="wide"
			title={step ? step.title : "Votre profil"}
			intro={
				step ? step.intro : "Un dernier coup d’œil avant de vous lancer."
			}
			footer={
				reviewing ? (
					<span className="block text-center">
						Vous pourrez tout modifier plus tard depuis votre profil.
					</span>
				) : (
					<div className="flex items-center justify-between gap-4">
						<button
							type="button"
							onClick={() => setIndex(index - 1)}
							disabled={index === 0}
							className="cursor-pointer underline transition-colors duration-200 ease-out hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
						>
							Précédent
						</button>

						<span>
							Étape {index + 1} sur {STEPS.length}
						</span>

						<button
							type="button"
							onClick={() => setIndex(index + 1)}
							disabled={profile.missing.includes(STEPS[index].key)}
							className="cursor-pointer underline transition-colors duration-200 ease-out hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
						>
							Suivant
						</button>
					</div>
				)
			}
		>
			<div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-14">
				<div className="flex flex-col gap-8">
					<Stepper activeStep={index} onStepChange={setIndex}>
						{STEPS.map((entry, position) => (
							<StepperItem
								key={entry.key}
								step={position}
								title={entry.label}
								state={
									profile.missing.includes(entry.key)
										? position === index
											? "active"
											: "inactive"
										: "completed"
								}
								// On ne saute pas vers une etape encore inaccessible :
								// seules celles deja remplies, ou celle en cours, le sont.
								reachable={
									!profile.missing.includes(entry.key) || position <= index
								}
							/>
						))}
						<StepperItem
							step={REVIEW}
							title="Relecture"
							state={reviewing ? "active" : "inactive"}
							reachable={profile.missing.length === 0}
							last
						/>
					</Stepper>

					{StepBody ? (
						<StepBody profile={profile} onSaved={handleSaved} />
					) : (
						<ReviewStep
							steps={STEPS}
							onEdit={setIndex}
							onFinish={finish}
							pending={leaving}
						/>
					)}
				</div>

				<aside className="lg:sticky lg:top-8 lg:self-start">
					<p className="mb-3 text-xs tracking-wide text-muted uppercase">
						Aperçu de votre profil
					</p>
					<ProfilePreview profile={profile} />
				</aside>
			</div>
		</PrivateScreen>
	);
}
