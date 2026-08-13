"use client";

import { useActionState } from "react";
import { ActionButton } from "@/components/Form/Button";
import { TextArea } from "@/components/Form/TextArea";
import type { AuthError } from "@/lib/auth/errorMessages";
import { saveProfile } from "@/lib/profile/client";
import { Errors, fieldError, type StepProps } from "./StepBase";

const MAX_LENGTH = 500;

export function BiographyStep({ profile, onSaved }: StepProps) {
	const [errors, action, pending] = useActionState(
		async (_previous: AuthError[], formData: FormData): Promise<AuthError[]> => {
			const result = await saveProfile({
				biography: String(formData.get("biography") ?? ""),
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
		<form action={action} className="flex flex-col gap-6">
			<TextArea
				id="biography"
				label="Votre biographie"
				maxLength={MAX_LENGTH}
				placeholder="Ce que vous aimez, ce que vous cherchez, votre thé préféré…"
				defaultValue={profile.biography ?? ""}
				error={fieldError(errors, "biography")}
			/>

			<Errors errors={errors} only={["biography"]} />

			<ActionButton type="submit" tone="primary" disabled={pending}>
				{pending ? "Enregistrement…" : "Continuer"}
			</ActionButton>
		</form>
	);
}
