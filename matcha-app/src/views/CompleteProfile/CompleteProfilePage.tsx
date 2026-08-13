"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PrivateScreen } from "@/components/Layout/Screen";
import type { Profile } from "@/lib/profile/client";
import { AboutStep } from "./AboutStep";
import { BiographyStep } from "./BiographyStep";
import { LocationStep } from "./LocationStep";
import { PhotosStep } from "./PhotosStep";
import type { StepProps } from "./StepBase";
import { TagsStep } from "./TagsStep";

type Step = {
	key: string;
	title: string;
	intro: string;
	Body: (props: StepProps) => React.ReactNode;
};

const STEPS: readonly Step[] = [
	{
		key: "gender",
		title: "Qui êtes-vous ?",
		intro: "Ces deux réponses déterminent les profils qui vous seront proposés.",
		Body: AboutStep,
	},
	{
		key: "biography",
		title: "Présentez-vous",
		intro: "Quelques lignes suffisent, elles seront visibles sur votre profil.",
		Body: BiographyStep,
	},
	{
		key: "tags",
		title: "Ce que vous aimez",
		intro: "Les centres d’intérêt partagés font remonter les profils proches.",
		Body: TagsStep,
	},
	{
		key: "location",
		title: "Où êtes-vous ?",
		intro: "La proximité compte autant que les affinités.",
		Body: LocationStep,
	},
	{
		key: "profile_photo",
		title: "Vos photos",
		intro: "Une photo de profil est nécessaire pour aimer et être aimé.",
		Body: PhotosStep,
	},
];

function firstMissing(missing: string[]) {
	const index = STEPS.findIndex((step) => missing.includes(step.key));
	return index === -1 ? 0 : index;
}

export function CompleteProfilePage({ initial }: { initial: Profile }) {
	const router = useRouter();
	const [profile, setProfile] = useState(initial);
	const [index, setIndex] = useState(() => firstMissing(initial.missing));

	const step = STEPS[index];
	const done = !profile.missing.includes(step.key);

	function handleSaved(next: Profile) {
		setProfile(next);

		if (next.missing.length === 0) {
			router.push("/me");
			router.refresh();
			return;
		}

		if (!next.missing.includes(step.key)) {
			setIndex(firstMissing(next.missing));
		}
	}

	return (
		<PrivateScreen
			title={step.title}
			intro={step.intro}
			footer={
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
						disabled={!done || index === STEPS.length - 1}
						className="cursor-pointer underline transition-colors duration-200 ease-out hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
					>
						Suivant
					</button>
				</div>
			}
		>
			<div className="flex flex-col gap-6">
				<ol className="flex gap-1.5" aria-label="Progression">
					{STEPS.map((entry, position) => (
						<li
							key={entry.key}
							aria-current={position === index ? "step" : undefined}
							className={`h-1.5 flex-1 rounded-full ${
								profile.missing.includes(entry.key)
									? position === index
										? "bg-matcha/50"
										: "bg-edge/30"
									: "bg-matcha"
							}`}
						/>
					))}
				</ol>

				<step.Body profile={profile} onSaved={handleSaved} />
			</div>
		</PrivateScreen>
	);
}
