"use client";

import Image from "next/image";
import { useRef, useState, useTransition } from "react";
import { ActionButton } from "@/components/Form/Button";
import type { AuthError } from "@/lib/auth/errorMessages";
import {
	addPhoto,
	pickProfilePhoto,
	removePhoto,
	type ProfileResult,
} from "@/lib/profile/client";
import { Errors, type StepProps } from "./StepBase";

const MAXIMUM = 5;

export function PhotosStep({ profile, onSaved, onNext }: StepProps) {
	const input = useRef<HTMLInputElement>(null);
	const [errors, setErrors] = useState<AuthError[]>([]);
	const [pending, startTransition] = useTransition();

	function run(call: () => Promise<ProfileResult>) {
		startTransition(async () => {
			const result = await call();
			if (!result.ok) {
				setErrors(result.errors);
				return;
			}

			setErrors([]);
			onSaved(result.data.profile);
		});
	}

	function choose(file: File | undefined) {
		if (input.current) {
			input.current.value = "";
		}
		if (file) {
			run(() => addPhoto(file));
		}
	}

	const full = profile.photos.length >= MAXIMUM;

	return (
		<div className="flex flex-col gap-6">
			<div>
				<p className="text-sm font-medium">Vos photos</p>
				<p className="mt-1 text-xs text-muted">
					{profile.photos.length} sur {MAXIMUM}. La première est votre photo de
					profil, vous pouvez en désigner une autre.
				</p>
			</div>

			{profile.photos.length > 0 ? (
				<ul className="grid grid-cols-2 gap-3">
					{profile.photos.map((photo) => (
						<li
							key={photo.id}
							className={`overflow-hidden rounded-xl border bg-white/70 ${
								photo.is_profile ? "border-matcha" : "border-edge"
							}`}
						>
							<div className="relative aspect-square">
								<Image
									src={photo.url}
									alt=""
									fill
									unoptimized
									sizes="50vw"
									className="object-cover"
								/>
							</div>

							<div className="flex items-center justify-between gap-2 px-2.5 py-2 text-xs">
								{photo.is_profile ? (
									<span className="font-medium text-matcha">Profil</span>
								) : (
									<button
										type="button"
										onClick={() => run(() => pickProfilePhoto(photo.id))}
										disabled={pending}
										className="cursor-pointer text-muted underline transition-colors duration-200 ease-out hover:text-ink disabled:cursor-not-allowed disabled:opacity-60"
									>
										Choisir
									</button>
								)}

								<button
									type="button"
									onClick={() => run(() => removePhoto(photo.id))}
									disabled={pending}
									aria-label="Supprimer cette photo"
									className="cursor-pointer text-red-800 underline transition-colors duration-200 ease-out hover:text-red-900 disabled:cursor-not-allowed disabled:opacity-60"
								>
									Supprimer
								</button>
							</div>
						</li>
					))}
				</ul>
			) : null}

			<Errors errors={errors} />

			<div className="flex flex-col gap-3">
				<input
					ref={input}
					id="photo"
					type="file"
					accept="image/jpeg,image/png,image/webp"
					onChange={(event) => choose(event.target.files?.[0])}
					className="sr-only"
				/>

				<ActionButton
					type="button"
					tone="secondary"
					onClick={() => input.current?.click()}
					disabled={pending || full}
				>
					{pending ? "Envoi…" : full ? "Cinq photos maximum" : "Ajouter une photo"}
				</ActionButton>

				<p className="text-xs text-muted">
					JPEG, PNG ou WebP, 5 Mo maximum. Les données de localisation des
					fichiers sont retirées à l’envoi.
				</p>
			</div>

			{/* Chaque envoi est enregistre aussitot : l'etape ne se quitte que
			    quand l'utilisateur le decide, sinon la premiere photo mettrait fin
			    a l'etape avant qu'il ait pu en ajouter d'autres. */}
			<ActionButton
				type="button"
				tone="primary"
				onClick={onNext}
				disabled={profile.photos.length === 0 || pending}
			>
				Continuer
			</ActionButton>
		</div>
	);
}
