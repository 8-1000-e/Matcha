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

function Chevron({ back }: { back: boolean }) {
	return (
		<svg viewBox="0 0 16 16" className="size-4" aria-hidden="true" fill="none">
			<path
				d={back ? "M10 3.5 5.5 8l4.5 4.5" : "M6 3.5 10.5 8 6 12.5"}
				stroke="currentColor"
				strokeWidth="1.75"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
}

export function PhotosStep({ profile, onSaved, onNext }: StepProps) {
	const input = useRef<HTMLInputElement>(null);
	const [errors, setErrors] = useState<AuthError[]>([]);
	const [pending, startTransition] = useTransition();
	const [slide, setSlide] = useState(0);

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

	function upload(file: File | undefined) {
		if (input.current) {
			input.current.value = "";
		}
		if (file) {
			// La nouvelle photo arrive en fin de galerie : on l'affiche pour que
			// l'envoi se voie sans avoir a la chercher.
			setSlide(profile.photos.length);
			run(() => addPhoto(file));
		}
	}

	const photos = profile.photos;
	const count = photos.length;
	// Une suppression peut rendre l'index courant hors limites : on le borne au
	// rendu plutot que de le corriger dans un effet, qui rendrait deux fois.
	const current = count === 0 ? 0 : Math.min(slide, count - 1);
	const photo = photos[current];

	function move(step: number) {
		setSlide((current + step + count) % count);
	}

	return (
		<div className="flex flex-col gap-5">
			<input
				ref={input}
				id="photo"
				type="file"
				accept="image/jpeg,image/png,image/webp"
				onChange={(event) => upload(event.target.files?.[0])}
				className="sr-only"
			/>

			{photo ? (
				<div className="flex flex-col gap-3">
					<div className="flex items-center gap-3">
						<button
							type="button"
							onClick={() => move(-1)}
							disabled={count < 2}
							aria-label="Photo précédente"
							className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted transition-colors duration-200 ease-out hover:bg-leaf/40 hover:text-ink disabled:cursor-not-allowed disabled:opacity-30"
						>
							<Chevron back />
						</button>

						<div
							className={`relative aspect-square w-full max-w-56 overflow-hidden rounded-2xl ${
								photo.is_profile ? "ring-2 ring-matcha" : "ring-1 ring-edge"
							}`}
						>
							<Image
								src={photo.url}
								alt=""
								fill
								unoptimized
								sizes="224px"
								className="object-cover"
							/>

							{photo.is_profile ? (
								<span className="absolute bottom-0 left-0 rounded-tr-xl bg-matcha px-2.5 py-1 text-[11px] font-medium text-white">
									Photo de profil
								</span>
							) : null}

							<button
								type="button"
								onClick={() => run(() => removePhoto(photo.id))}
								disabled={pending}
								aria-label="Supprimer cette photo"
								className="absolute top-2 right-2 flex size-8 cursor-pointer items-center justify-center rounded-full bg-white/90 text-ink backdrop-blur-sm transition-colors duration-200 ease-out hover:bg-white hover:text-red-800 disabled:cursor-not-allowed disabled:opacity-60"
							>
								<svg viewBox="0 0 14 14" className="size-3.5" fill="none">
									<path
										d="M3.5 3.5l7 7M10.5 3.5l-7 7"
										stroke="currentColor"
										strokeWidth="1.75"
										strokeLinecap="round"
									/>
								</svg>
							</button>
						</div>

						<button
							type="button"
							onClick={() => move(1)}
							disabled={count < 2}
							aria-label="Photo suivante"
							className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted transition-colors duration-200 ease-out hover:bg-leaf/40 hover:text-ink disabled:cursor-not-allowed disabled:opacity-30"
						>
							<Chevron back={false} />
						</button>
					</div>

					<ol className="flex justify-center gap-1.5">
						{photos.map((entry, index) => (
							<li key={entry.id}>
								{/* La pastille reste petite, mais la zone cliquable tient
								    compte du doigt. */}
								<button
									type="button"
									onClick={() => setSlide(index)}
									aria-label={`Photo ${index + 1}`}
									aria-current={index === current ? "true" : undefined}
									className="flex cursor-pointer p-2"
								>
									<span
										className={`size-1.5 rounded-full transition-colors duration-200 ${
											index === current ? "bg-matcha" : "bg-edge"
										}`}
									/>
								</button>
							</li>
						))}
					</ol>

					{photo.is_profile ? (
						<p className="text-center text-xs text-muted">
							{count} photo{count > 1 ? "s" : ""} sur {MAXIMUM}.
						</p>
					) : (
						<ActionButton
							type="button"
							tone="secondary"
							onClick={() => run(() => pickProfilePhoto(photo.id))}
							disabled={pending}
						>
							En faire ma photo de profil
						</ActionButton>
					)}
				</div>
			) : (
				<button
					type="button"
					onClick={() => input.current?.click()}
					disabled={pending}
					className="flex aspect-square w-full max-w-56 cursor-pointer flex-col items-center justify-center gap-2 self-center rounded-2xl border border-dashed border-edge bg-white/40 text-sm text-muted transition-colors duration-200 ease-out hover:border-matcha/60 hover:text-matcha disabled:cursor-not-allowed disabled:opacity-60"
				>
					<span className="text-2xl leading-none">+</span>
					Ajouter une photo
				</button>
			)}

			<Errors errors={errors} />

			{count > 0 && count < MAXIMUM ? (
				<ActionButton
					type="button"
					tone="secondary"
					onClick={() => input.current?.click()}
					disabled={pending}
				>
					{pending ? "Envoi…" : "Ajouter une photo"}
				</ActionButton>
			) : null}

			<p className="text-xs text-muted">
				JPEG, PNG ou WebP, 5 Mo maximum. Une photo de profil est nécessaire pour
				aimer un autre profil. Les données de localisation des fichiers sont
				retirées à l’envoi.
			</p>

			{/* Chaque envoi est enregistre aussitot : sans ce bouton, la premiere
			    photo ferait quitter l'etape avant d'avoir pu en ajouter d'autres. */}
			<ActionButton
				type="button"
				tone="primary"
				onClick={onNext}
				disabled={count === 0 || pending}
			>
				Continuer
			</ActionButton>
		</div>
	);
}
