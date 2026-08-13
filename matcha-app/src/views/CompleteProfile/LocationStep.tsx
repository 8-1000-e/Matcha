"use client";

import { useActionState, useState, useTransition } from "react";
import { ActionButton } from "@/components/Form/Button";
import { Notice } from "@/components/Form/Notice";
import { TextField } from "@/components/Form/TextField";
import type { AuthError } from "@/lib/auth/errorMessages";
import { saveLocation } from "@/lib/profile/client";
import { Errors, fieldError, type StepProps } from "./StepBase";

const DENIED = "Position refusée. Saisissez votre ville juste en dessous.";
const UNAVAILABLE
	= "Votre navigateur ne partage pas votre position. Saisissez votre ville.";

export function LocationStep({ profile, onSaved }: StepProps) {
	const [notice, setNotice] = useState("");
	const [errors, setErrors] = useState<AuthError[]>([]);
	const [locating, startLocating] = useTransition();

	const [formErrors, action, pending] = useActionState(
		async (_previous: AuthError[], formData: FormData): Promise<AuthError[]> => {
			const result = await saveLocation({
				city: String(formData.get("city") ?? ""),
			});

			if (!result.ok) {
				return result.errors;
			}

			setNotice("");
			onSaved(result.data.profile);
			return [];
		},
		[],
	);

	function locate() {
		setErrors([]);
		setNotice("");

		if (!navigator.geolocation) {
			setNotice(UNAVAILABLE);
			return;
		}

		navigator.geolocation.getCurrentPosition(
			(position) => {
				startLocating(async () => {
					const result = await saveLocation({
						latitude: position.coords.latitude,
						longitude: position.coords.longitude,
					});

					if (!result.ok) {
						setErrors(result.errors);
						return;
					}

					onSaved(result.data.profile);
				});
			},
			() => setNotice(DENIED),
		);
	}

	return (
		<div className="flex flex-col gap-6">
			{profile.city ? (
				<Notice>
					Position actuelle : {profile.city}
					{profile.neighborhood ? `, ${profile.neighborhood}` : ""}.
				</Notice>
			) : null}

			<div className="flex flex-col gap-3">
				<ActionButton
					type="button"
					tone="primary"
					onClick={locate}
					disabled={locating}
				>
					{locating ? "Localisation…" : "Utiliser ma position"}
				</ActionButton>
				<p className="text-xs text-muted">
					Votre position sert à vous proposer des profils proches. Elle n’est
					jamais partagée plus précisément que le quartier.
				</p>
			</div>

			<Errors errors={errors} />
			{notice ? <Notice>{notice}</Notice> : null}

			<div className="flex items-center gap-3 text-xs text-muted">
				<span className="h-px flex-1 bg-edge/40" />
				ou
				<span className="h-px flex-1 bg-edge/40" />
			</div>

			<form action={action} className="flex flex-col gap-5">
				<TextField
					id="city"
					label="Votre ville"
					autoComplete="address-level2"
					defaultValue={profile.city ?? ""}
					error={fieldError(formErrors, "city")}
				/>

				<Errors errors={formErrors} only={["city"]} />

				<ActionButton type="submit" tone="secondary" disabled={pending}>
					{pending ? "Enregistrement…" : "Enregistrer ma ville"}
				</ActionButton>
			</form>
		</div>
	);
}
