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
	const [city, setCity] = useState(profile.city ?? "");

	const [formErrors, action, pending] = useActionState(
		async (_previous: AuthError[], formData: FormData): Promise<AuthError[]> => {
			const result = await saveLocation({
				city: String(formData.get("city") ?? ""),
			});

			if (!result.ok)
			{
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

		if (!navigator.geolocation)
		{
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

					if (!result.ok)
					{
						setErrors(result.errors);
						return;
					}

					onSaved(result.data.profile);
				});
			},
			() => setNotice(DENIED),
		);
	}

	const located = profile.city !== null;

	return (
		<div className="flex flex-col gap-6">
			{located ? (
				<div className="rounded-2xl bg-leaf/40 p-4 ring-1 ring-matcha/15">
					<p className="text-xs tracking-wide text-matcha-dark uppercase">
						Position trouvée
					</p>
					<p className="mt-1 text-lg font-semibold tracking-tight">
						{profile.city}
						{profile.neighborhood ? (
							<span className="font-normal text-muted">
								{" "}
								· {profile.neighborhood}
							</span>
						) : null}
					</p>
					<p className="mt-2 text-xs text-muted">
						Ce n’est pas la bonne ? Corrigez-la juste en dessous.
					</p>
				</div>
			) : null}

			<div className="flex flex-col gap-3">
				<ActionButton
					type="button"
					tone={located ? "secondary" : "primary"}
					onClick={locate}
					disabled={locating}
				>
					{locating
						? "Localisation…"
						: located
							? "Relancer la localisation"
							: "Utiliser ma position"}
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
				{located ? "ou corriger à la main" : "ou"}
				<span className="h-px flex-1 bg-edge/40" />
			</div>

			<form action={action} className="flex flex-col gap-5">
				<TextField
					// Le champ est non controle : cette cle le remonte quand le
					// geocodage renvoie une autre ville, sinon il garderait
					// l'ancienne valeur.
					key={profile.city ?? "none"}
					id="city"
					label="Votre ville"
					autoComplete="address-level2"
					defaultValue={city}
					onValue={setCity}
					error={fieldError(formErrors, "city")}
				/>

				<Errors errors={formErrors} only={["city"]} />

				<ActionButton
					type="submit"
					tone={located ? "primary" : "secondary"}
					disabled={pending || city.trim().length === 0}
				>
					{pending ? "Enregistrement…" : "Enregistrer cette ville"}
				</ActionButton>
			</form>
		</div>
	);
}
