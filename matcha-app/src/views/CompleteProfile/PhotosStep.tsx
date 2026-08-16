"use client";

import Image from "next/image";
import { useRef, useState, useTransition } from "react";
import { ActionButton } from "@/components/Form/Button";
import { PhotoDropZone } from "@/components/Photo/PhotoDropZone";
import { PhotoEditor } from "@/components/Photo/PhotoEditor";
import type { AuthError } from "@/lib/auth/errorMessages";
import {
	addPhoto,
	pickProfilePhoto,
	removePhoto,
	replacePhoto,
	type ProfileResult,
} from "@/lib/profile/client";
import { Errors, type StepProps } from "./StepBase";

const MAXIMUM = 5;

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
	const [slide, setSlide] = useState(0);
	const [sliding, setSliding] = useState(true);
	const [editing, setEditing] = useState<
		{ mode: "new"; source: File } | { mode: "replace"; id: string; source: string } | null
	>(null);

	function run(call: () => Promise<ProfileResult>, done?: () => void) {
		startTransition(async () => {
			const result = await call();
			if (!result.ok) {
				setErrors(result.errors);
				return;
			}

			setErrors([]);
			onSaved(result.data.profile);
			done?.();
		});
	}

	function upload(file: File | undefined) {
		if (input.current) {
			input.current.value = "";
		}
		if (file) {
			setEditing({ mode: "new", source: file });
		}
	}

	function saveEdited(file: File) {
		if (editing === null) {
			return;
		}
		if (editing.mode === "new") {
			const added = profile.photos.length;
			run(() => addPhoto(file), () => {
				setSlide(added);
				setEditing(null);
			});
			return;
		}
		run(() => replacePhoto(editing.id, file), () => setEditing(null));
	}

	const photos = profile.photos;
	const count = photos.length;
	const current = count === 0 ? 0 : modulo(slide, count);
	const photo = photos[current];
	const looping = count > 2;
	const strip = looping ? [...photos, ...photos, ...photos] : photos;
	const position = looping ? count + slide : current;

	function move(step: number) {
		setSlide(
			looping
				? slide + step
				: Math.min(Math.max(current + step, 0), count - 1),
		);
	}
	function settle() {
		const normalized = modulo(slide, count);
		if (normalized !== slide) {
			setSliding(false);
			setSlide(normalized);
			requestAnimationFrame(() => setSliding(true));
		}
	}

	const full = profile.photos.length >= MAXIMUM;

	return (
		<PhotoDropZone
			onFile={(file) => setEditing({ mode: "new", source: file })}
			disabled={pending || full}
			full={full}
		>
			<div className="flex flex-col gap-5">
				{editing !== null ? (
					<PhotoEditor
						source={editing.source}
						busy={pending}
						onCancel={() => setEditing(null)}
						onDone={saveEdited}
					/>
				) : null}

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
														onClick={() =>
															setEditing({
																mode: "replace",
																id: entry.id,
																source: entry.url,
															})}
														disabled={pending}
														aria-label="Retoucher cette photo"
														className="absolute top-0 left-0 cursor-pointer rounded-tl-2xl rounded-br-xl bg-white/90 p-1.5 text-ink transition-colors duration-200 ease-out hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
													>
														<svg viewBox="0 0 20 20" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
															<path d="M13.5 3.5 16.5 6.5 7 16H4v-3z" />
															<path d="m11.5 5.5 3 3" />
														</svg>
													</button>
												) : null}

												{index === position ? (
													<button
														type="button"
														onClick={() => run(() => removePhoto(entry.id))}
														disabled={pending}
														aria-label="Supprimer cette photo"
														className="absolute top-0 right-0 cursor-pointer rounded-tr-2xl rounded-bl-xl bg-red-600 p-1.5 text-white transition-colors duration-200 ease-out hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
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
										disabled={!looping && current === 0}
										aria-label="Photo précédente"
										className="absolute top-1/2 left-0 flex size-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white/90 text-ink shadow-[0_2px_8px_rgba(38,48,28,0.15)] backdrop-blur-sm transition-colors duration-200 ease-out hover:bg-white disabled:cursor-not-allowed disabled:opacity-30"
									>
										<Chevron back />
									</button>
									<button
										type="button"
										onClick={() => move(1)}
										disabled={!looping && current === count - 1}
										aria-label="Photo suivante"
										className="absolute top-1/2 right-0 flex size-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white/90 text-ink shadow-[0_2px_8px_rgba(38,48,28,0.15)] backdrop-blur-sm transition-colors duration-200 ease-out hover:bg-white disabled:cursor-not-allowed disabled:opacity-30"
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

						{/* Une photo seule est forcement la photo de profil : le serveur la
					    designe a l'envoi et en promeut une autre a la suppression. Rien
					    a proposer, donc. */}
						{photo.is_profile || count === 1 ? (
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
		</PhotoDropZone>
	);
}
