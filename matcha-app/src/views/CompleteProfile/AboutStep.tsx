"use client";

import { useActionState } from "react";
import { ActionButton } from "@/components/Form/Button";
import { ChoiceGroup } from "@/components/Form/ChoiceGroup";
import type { AuthError } from "@/lib/auth/errorMessages";
import { saveProfile, type Gender, type Orientation } from "@/lib/profile/client";
import { Errors, type StepProps } from "./StepBase";

const GENDERS = [
	{ value: "woman", label: "Une femme" },
	{ value: "man", label: "Un homme" },
	{ value: "non_binary", label: "Non-binaire" },
	{ value: "other", label: "Autre" },
] as const;

const ORIENTATIONS = [
	{ value: "hetero", label: "Hétérosexuel·le" },
	{ value: "homo", label: "Homosexuel·le" },
	{ value: "bi", label: "Bisexuel·le" },
	{ value: "pan", label: "Pansexuel·le" },
	{ value: "other", label: "Autre" },
] as const;

export function AboutStep({ profile, onSaved }: StepProps) {
	const [errors, action, pending] = useActionState(
		async (_previous: AuthError[], formData: FormData): Promise<AuthError[]> => {
			const result = await saveProfile({
				gender: String(formData.get("gender")) as Gender,
				orientation: String(formData.get("orientation")) as Orientation,
			});

			if (!result.ok) {
				return result.errors;
			}

			onSaved(result.data.profile);
			return [];
		},
		[],
	);

	return (
		<form action={action} className="flex flex-col gap-7">
			<ChoiceGroup
				legend="Vous êtes"
				name="gender"
				options={GENDERS}
				defaultValue={profile.gender}
			/>

			<ChoiceGroup
				legend="Vous recherchez"
				name="orientation"
				options={ORIENTATIONS}
				defaultValue={profile.orientation}
				hint="Sans précision, vous serez considéré comme bisexuel·le."
			/>

			<Errors errors={errors} />

			<ActionButton type="submit" tone="primary" disabled={pending}>
				{pending ? "Enregistrement…" : "Continuer"}
			</ActionButton>
		</form>
	);
}
