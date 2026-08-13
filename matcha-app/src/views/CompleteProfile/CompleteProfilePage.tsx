"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { PrivateScreen } from "@/components/Layout/Screen";
import { ProfilePreview } from "@/components/Profile/ProfilePreview";
import type { Profile } from "@/lib/profile/client";
import { AboutStep } from "./AboutStep";
import { BiographyStep } from "./BiographyStep";
import { LocationStep } from "./LocationStep";
import { PhotosStep } from "./PhotosStep";
import { ReviewStep } from "./ReviewStep";
import type { StepProps } from "./StepBase";
import { StepProgress } from "./StepProgress";
import { TagsStep } from "./TagsStep";

type Step = {
	key: string;
	label: string;
	title: string;
	intro: string;
	Body: (props: StepProps) => React.ReactNode;
	/** Reste affichee apres l'enregistrement, pour laisser verifier le resultat. */
	hold?: true;
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
		hold: true,
	},
	{
		key: "profile_photo",
		label: "Photos",
		title: "Vos photos",
		intro: "Une photo de profil est nécessaire pour aimer et être aimé.",
		Body: PhotosStep,
		hold: true,
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
		if (step && !step.hold && !next.missing.includes(step.key))
		{
			setIndex(firstMissing(next.missing));
		}
	}

	function advance() {
		setIndex(firstMissing(profile.missing));
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
			center
			footer={
				reviewing ? (
					<span className="block text-center">
						Vous pourrez tout modifier plus tard depuis votre profil.
					</span>
				) : null
			}
		>
			{/* A la relecture, l'apercu n'est plus un a-cote : il devient la page.
			    Plus de barre d'etapes ni de colonne laterale, les corrections se
			    font sous la fiche. */}
			{reviewing ? (
				<div className="mx-auto w-full max-w-lg">
					<h1 className="text-center text-xl font-semibold tracking-tight">
						Votre profil
					</h1>
					<p className="mx-auto mt-1.5 mb-8 max-w-sm text-center text-sm text-muted">
						C’est exactement ce que les autres verront. Ouvrez une section pour
						la corriger.
					</p>

					<ReviewStep
						steps={STEPS}
						profile={profile}
						onSaved={setProfile}
						onFinish={finish}
						pending={leaving}
					/>
				</div>
			) : (
				<div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-0">
					<div className="min-w-0 lg:max-w-md">
						<h1 className="text-xl font-semibold tracking-tight">
							{step?.title}
						</h1>
						<p className="mt-1.5 mb-6 text-sm text-muted">{step?.intro}</p>

						<StepProgress
							steps={STEPS}
							index={index}
							missing={profile.missing}
							onBack={() => setIndex(index - 1)}
							onNext={() => setIndex(index + 1)}
						/>

						{StepBody ? (
							<StepBody profile={profile} onSaved={handleSaved} onNext={advance} />
						) : null}
					</div>

					<aside className="lg:sticky lg:top-6 lg:self-start lg:border-l lg:border-edge/25 lg:pl-12">
						<p className="mb-3.5 text-[11px] leading-5 tracking-wide text-muted uppercase">
							Aperçu de votre profil
						</p>
						<ProfilePreview profile={profile} />
					</aside>
				</div>
			)}
		</PrivateScreen>
	);
}
