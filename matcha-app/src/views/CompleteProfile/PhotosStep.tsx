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
/**
 * Largeur d'un emplacement, marges comprises. Les voisines sont reduites a
 * SIDE_SCALE, ce qui les fait tenir entierement dans la colonne au lieu d'etre
 * coupees par ses bords.
 */
const SLIDE_PX = 160;
const SIDE_SCALE = "scale-[0.78]";

function modulo(value: number, size: number) {
	return ((value % size) + size) % size;
}

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
	// Compteur non borne : depasser les extremites est ce qui permet d'animer le
	// passage de la derniere photo a la premiere. Il revient dans l'intervalle
	// une fois l'animation terminee.
	const [slide, setSlide] = useState(0);
	const [sliding, setSliding] = useState(true);

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
	// Une suppression peut laisser l'index hors limites : il est ramene au rendu
	// plutot que corrige dans un effet, qui rendrait deux fois.
	const current = count === 0 ? 0 : modulo(slide, count);
	const photo = photos[current];

	// Au-dela d'une photo, la galerie est rendue en trois exemplaires et centree
	// sur celui du milieu : il y a donc toujours une voisine de chaque cote, y
	// compris aux extremites. Une seule photo n'est evidemment pas triplee, sinon
	// elle aurait l'air d'en etre trois.
	const looping = count > 1;
	const strip = looping ? [...photos, ...photos, ...photos] : photos;
	const position = looping ? count + slide : 0;

	function move(step: number) {
		setSlide(slide + step);
	}

	/**
	 * Une fois l'animation finie, le compteur revient dans l'intervalle et la
	 * piste saute d'un exemplaire a l'autre. Le saut se fait sans transition,
	 * donc a l'ecran rien ne bouge ; la frame suivante la reactive.
	 */
	function settle() {
		const normalized = modulo(slide, count);
		if (normalized !== slide) {
			setSliding(false);
			setSlide(normalized);
			requestAnimationFrame(() => setSliding(true));
		}
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
					<div className="relative">
						<div className="overflow-hidden">
							{/* left-1/2 se calcule sur le conteneur, contrairement a un
							    pourcentage de translation qui porterait sur la piste
							    elle-meme : c'est lui qui centre la photo courante. */}
							<div
								onTransitionEnd={settle}
								className={`relative left-1/2 flex ${
									sliding ? "transition-transform duration-300 ease-out" : ""
								}`}
								style={{
									transform: `translateX(-${(position + 0.5) * SLIDE_PX}px)`,
								}}
							>
								{strip.map((entry, index) => (
									<div
										key={`${entry.id}-${index}`}
										style={{ width: SLIDE_PX }}
										className="shrink-0 px-1.5 py-1"
									>
										<div
											className={`relative aspect-square overflow-hidden rounded-2xl transition-all duration-300 ease-out ${
												index === position
													? "scale-100 opacity-100"
													: `${SIDE_SCALE} opacity-45`
											} ${
												entry.is_profile
													? "ring-2 ring-matcha"
													: "ring-1 ring-edge"
											}`}
										>
											<Image
												src={entry.url}
												alt=""
												fill
												unoptimized
												sizes="160px"
												className="object-cover"
											/>

											{entry.is_profile ? (
												<span className="absolute bottom-0 left-0 rounded-tr-xl bg-matcha px-2.5 py-1 text-[11px] font-medium text-white">
													Photo de profil
												</span>
											) : null}

											{/* Attachee a la photo, et seulement sur celle du
											    milieu : les exemplaires voisins ne sont la que
											    pour l'apercu. */}
											{index === position ? (
												<button
													type="button"
													onClick={() => run(() => removePhoto(entry.id))}
													disabled={pending}
													aria-label="Supprimer cette photo"
													className="absolute top-1.5 right-1.5 cursor-pointer p-1.5 text-red-600 drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)] transition-colors duration-200 ease-out hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-60"
												>
													<svg viewBox="0 0 12 12" className="size-3" fill="none">
														<path
															d="M3 3l6 6M9 3l-6 6"
															stroke="currentColor"
															strokeWidth="2.25"
															strokeLinecap="round"
														/>
													</svg>
												</button>
											) : null}
										</div>
									</div>
								))}
							</div>
						</div>

						{count > 1 ? (
							<>
								<button
									type="button"
									onClick={() => move(-1)}
									aria-label="Photo précédente"
									className="absolute top-1/2 left-0 flex size-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white/90 text-ink shadow-[0_2px_8px_rgba(38,48,28,0.15)] backdrop-blur-sm transition-colors duration-200 ease-out hover:bg-white"
								>
									<Chevron back />
								</button>
								<button
									type="button"
									onClick={() => move(1)}
									aria-label="Photo suivante"
									className="absolute top-1/2 right-0 flex size-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white/90 text-ink shadow-[0_2px_8px_rgba(38,48,28,0.15)] backdrop-blur-sm transition-colors duration-200 ease-out hover:bg-white"
								>
									<Chevron back={false} />
								</button>
							</>
						) : null}
					</div>

					{count > 1 ? (
						<ol className="flex justify-center">
							{photos.map((entry, index) => (
								<li key={entry.id}>
									{/* La pastille reste discrete, mais la zone cliquable
									    tient compte du doigt. */}
									<button
										type="button"
										onClick={() => setSlide(index)}
										aria-label={`Photo ${index + 1}`}
										aria-current={index === current ? "true" : undefined}
										className="flex cursor-pointer p-2"
									>
										<span
											className={`h-1.5 rounded-full transition-all duration-300 ease-out ${
												index === current ? "w-5 bg-matcha" : "w-1.5 bg-edge"
											}`}
										/>
									</button>
								</li>
							))}
						</ol>
					) : null}

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
