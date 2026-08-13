"use client";

import { useState, useTransition } from "react";
import { ActionButton } from "@/components/Form/Button";
import { Notice } from "@/components/Form/Notice";
import type { AuthError } from "@/lib/auth/errorMessages";
import { type Place, saveLocation } from "@/lib/profile/client";
import { CityPicker } from "./CityPicker";
import { Errors, fieldError, type StepProps } from "./StepBase";

const DENIED = "Position refusée. Choisissez votre ville juste en dessous.";
const UNAVAILABLE
	= "Votre navigateur ne partage pas votre position. Choisissez votre ville.";
const NO_SIGNAL
	= "Votre position n’a pas pu être déterminée. Choisissez votre ville juste en dessous.";
const TIMED_OUT
	= "La localisation a pris trop de temps. Réessayez ou choisissez votre ville.";

function geolocationMessage(error: GeolocationPositionError) {
	if (error.code === error.PERMISSION_DENIED) {
		return DENIED;
	}
	return error.code === error.TIMEOUT ? TIMED_OUT : NO_SIGNAL;
}

export function LocationStep({ profile, onSaved, onNext }: StepProps) {
	const [notice, setNotice] = useState("");
	const [errors, setErrors] = useState<AuthError[]>([]);
	const [pending, startSaving] = useTransition();
	// L'acquisition GPS peut durer une vingtaine de secondes, bien avant que la
	// transition d'enregistrement ne demarre : sans cet etat, le bouton reste
	// inerte et l'utilisateur relance la demande.
	const [locating, setLocating] = useState(false);

	function save(fields: Parameters<typeof saveLocation>[0]) {
		setErrors([]);
		startSaving(async () => {
			const result = await saveLocation(fields);
			if (!result.ok) {
				setErrors(result.errors);
				return;
			}
			setNotice("");
			onSaved(result.data.profile);
		});
	}

	function locate() {
		if (locating || pending) {
			return;
		}

		setErrors([]);
		setNotice("");

		if (!navigator.geolocation) {
			setNotice(UNAVAILABLE);
			return;
		}

		setLocating(true);
		navigator.geolocation.getCurrentPosition(
			(position) => {
				setLocating(false);
				save({
					latitude: position.coords.latitude,
					longitude: position.coords.longitude,
				});
			},
			(error) => {
				setLocating(false);
				setNotice(geolocationMessage(error));
			},
		);
	}

	function pick(place: Place) {
		save({
			city: place.city,
			neighborhood: place.neighborhood,
			latitude: place.latitude,
			longitude: place.longitude,
		});
	}

	const located = profile.city !== null;

	return (
		<div className="flex flex-col gap-6">
			{located ? (
				<div className="rounded-2xl bg-leaf/40 p-4 ring-1 ring-matcha/15">
					<p className="text-xs tracking-wide text-matcha-dark uppercase">
						Position enregistrée
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
						Ce n’est pas la bonne ? Choisissez-en une autre ci-dessous.
					</p>
				</div>
			) : null}

			<div className="flex flex-col gap-3">
				<ActionButton
					type="button"
					tone={located ? "secondary" : "primary"}
					onClick={locate}
					disabled={pending || locating}
				>
					{locating
						? "Localisation en cours…"
						: pending
							? "Enregistrement…"
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

			<CityPicker
				// Le champ suit la ville enregistree quand le geocodage en renvoie
				// une autre, sinon il garderait la valeur precedente.
				key={profile.city ?? "none"}
				defaultValue={profile.city ?? ""}
				error={fieldError(errors, "city")}
				onPick={pick}
			/>

			{/* L'etape enregistre des qu'une position est choisie : ce bouton ne
			    sauvegarde rien, il sert a passer a la suite une fois verifie. */}
			<ActionButton
				type="button"
				tone="primary"
				onClick={onNext}
				disabled={!located || pending || locating}
			>
				Continuer
			</ActionButton>
		</div>
	);
}
