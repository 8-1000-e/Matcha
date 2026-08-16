"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Alert } from "@/components/Form/Alert";
import { ActionButton } from "@/components/Form/Button";

const PREVIEW = 320;
const EXPORT = 1024;
const MAX_ZOOM = 3;

const FILTERS: readonly { key: string; label: string; css: string }[] = [
	{ key: "none", label: "Aucun", css: "none" },
	{ key: "warm", label: "Chaud", css: "saturate(1.25) sepia(0.2) contrast(1.05)" },
	{ key: "cool", label: "Froid", css: "saturate(1.1) hue-rotate(-12deg) brightness(1.05)" },
	{ key: "mono", label: "Noir et blanc", css: "grayscale(1) contrast(1.1)" },
	{ key: "faded", label: "Passé", css: "saturate(0.75) brightness(1.08) contrast(0.9)" },
	{ key: "punch", label: "Punch", css: "saturate(1.5) contrast(1.2)" },
];

interface Adjust {
	brightness: number;
	contrast: number;
	saturate: number;
}

const NEUTRAL: Adjust = { brightness: 1, contrast: 1, saturate: 1 };

function filterFor(preset: string, adjust: Adjust): string {
	const base = FILTERS.find((entry) => entry.key === preset)?.css ?? "none";
	const tuning = `brightness(${adjust.brightness}) contrast(${adjust.contrast}) saturate(${adjust.saturate})`;
	return base === "none" ? tuning : `${base} ${tuning}`;
}

function drawSquare(
	canvas: HTMLCanvasElement,
	image: HTMLImageElement,
	size: number,
	state: {
		rotation: number;
		zoom: number;
		offsetX: number;
		offsetY: number;
		preset: string;
		adjust: Adjust;
	},
) {
	const context = canvas.getContext("2d");
	if (context === null) {
		return;
	}

	canvas.width = size;
	canvas.height = size;
	context.clearRect(0, 0, size, size);
	context.fillStyle = "#f4f8ee";
	context.fillRect(0, 0, size, size);

	const turned = state.rotation % 180 !== 0;
	const width = turned ? image.naturalHeight : image.naturalWidth;
	const height = turned ? image.naturalWidth : image.naturalHeight;
	const cover = Math.max(size / width, size / height) * state.zoom;

	context.save();
	context.filter = filterFor(state.preset, state.adjust);
	context.translate(size / 2 + state.offsetX * size, size / 2 + state.offsetY * size);
	context.rotate((state.rotation * Math.PI) / 180);
	context.scale(cover, cover);
	context.drawImage(
		image,
		-image.naturalWidth / 2,
		-image.naturalHeight / 2,
		image.naturalWidth,
		image.naturalHeight,
	);
	context.restore();
}

export function PhotoEditor({
	source,
	busy = false,
	onCancel,
	onDone,
}: {
	source: File | string;
	busy?: boolean;
	onCancel: () => void;
	onDone: (file: File) => void;
}) {
	const canvas = useRef<HTMLCanvasElement>(null);
	const image = useRef<HTMLImageElement | null>(null);
	const drag = useRef<{ x: number; y: number } | null>(null);

	const [ready, setReady] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [rotation, setRotation] = useState(0);
	const [zoom, setZoom] = useState(1);
	const [offset, setOffset] = useState({ x: 0, y: 0 });
	const [preset, setPreset] = useState("none");
	const [adjust, setAdjust] = useState<Adjust>(NEUTRAL);

	useEffect(() => {
		const url = typeof source === "string" ? source : URL.createObjectURL(source);
		const element = new Image();
		element.decoding = "async";
		element.onload = () => {
			image.current = element;
			setReady(true);
		};
		element.onerror = () => setError("Cette image ne peut pas être ouverte.");
		element.src = url;

		return () => {
			if (typeof source !== "string") {
				URL.revokeObjectURL(url);
			}
		};
	}, [source]);

	const paint = useCallback(() => {
		if (canvas.current === null || image.current === null) {
			return;
		}
		drawSquare(canvas.current, image.current, PREVIEW, {
			rotation,
			zoom,
			offsetX: offset.x,
			offsetY: offset.y,
			preset,
			adjust,
		});
	}, [rotation, zoom, offset.x, offset.y, preset, adjust]);

	useEffect(() => {
		if (ready) {
			paint();
		}
	}, [ready, paint]);

	function startDrag(event: React.PointerEvent<HTMLCanvasElement>) {
		event.currentTarget.setPointerCapture(event.pointerId);
		drag.current = { x: event.clientX, y: event.clientY };
	}

	function moveDrag(event: React.PointerEvent<HTMLCanvasElement>) {
		if (drag.current === null) {
			return;
		}
		const dx = (event.clientX - drag.current.x) / PREVIEW;
		const dy = (event.clientY - drag.current.y) / PREVIEW;
		drag.current = { x: event.clientX, y: event.clientY };
		setOffset((current) => ({
			x: Math.max(-0.5, Math.min(0.5, current.x + dx)),
			y: Math.max(-0.5, Math.min(0.5, current.y + dy)),
		}));
	}

	function endDrag() {
		drag.current = null;
	}

	function reset() {
		setRotation(0);
		setZoom(1);
		setOffset({ x: 0, y: 0 });
		setPreset("none");
		setAdjust(NEUTRAL);
	}

	function apply() {
		if (image.current === null) {
			return;
		}
		const output = document.createElement("canvas");
		drawSquare(output, image.current, EXPORT, {
			rotation,
			zoom,
			offsetX: offset.x,
			offsetY: offset.y,
			preset,
			adjust,
		});
		output.toBlob(
			(blob) => {
				if (blob === null) {
					setError("L’image n’a pas pu être exportée.");
					return;
				}
				onDone(new File([blob], "photo.webp", { type: "image/webp" }));
			},
			"image/webp",
			0.92,
		);
	}

	return (
		<div
			role="dialog"
			aria-modal="true"
			aria-label="Retoucher la photo"
			className="fixed inset-0 z-30 flex items-center justify-center bg-ink/70 p-4 backdrop-blur-sm"
		>
			<div className="max-h-full w-full max-w-3xl overflow-y-auto rounded-2xl bg-cream p-5 shadow-lg">
				<div className="flex items-start justify-between gap-4">
					<div>
						<h2 className="text-base font-semibold">Retoucher la photo</h2>
						<p className="mt-1 text-sm text-muted">
							Faites glisser pour recadrer, puis choisissez un filtre.
						</p>
					</div>
					<button
						type="button"
						onClick={onCancel}
						aria-label="Fermer"
						className="flex size-9 cursor-pointer items-center justify-center rounded-lg text-muted transition-colors duration-200 ease-out hover:bg-leaf/50 hover:text-ink"
					>
						<svg viewBox="0 0 16 16" className="size-4" fill="none" aria-hidden="true">
							<path
								d="M4 4l8 8M12 4l-8 8"
								stroke="currentColor"
								strokeWidth="1.8"
								strokeLinecap="round"
							/>
						</svg>
					</button>
				</div>

				<div className="mt-4 grid gap-5 md:grid-cols-[20rem_1fr]">
					<div className="flex flex-col gap-3">
						<canvas
							ref={canvas}
							width={PREVIEW}
							height={PREVIEW}
							onPointerDown={startDrag}
							onPointerMove={moveDrag}
							onPointerUp={endDrag}
							onPointerCancel={endDrag}
							className="aspect-square w-full max-w-80 cursor-grab touch-none rounded-xl ring-1 ring-edge/40 active:cursor-grabbing"
						/>

						<div className="flex items-center gap-2">
							<button
								type="button"
								onClick={() => setRotation((current) => (current + 270) % 360)}
								aria-label="Pivoter à gauche"
								className="flex size-9 cursor-pointer items-center justify-center rounded-lg border border-edge bg-white/70 transition-colors duration-200 ease-out hover:bg-leaf/50"
							>
								<svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
									<path d="M4 8h7a4 4 0 0 1 0 8H8" />
									<path d="m4 8 3-3M4 8l3 3" />
								</svg>
							</button>
							<button
								type="button"
								onClick={() => setRotation((current) => (current + 90) % 360)}
								aria-label="Pivoter à droite"
								className="flex size-9 cursor-pointer items-center justify-center rounded-lg border border-edge bg-white/70 transition-colors duration-200 ease-out hover:bg-leaf/50"
							>
								<svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
									<path d="M16 8H9a4 4 0 0 0 0 8h3" />
									<path d="m16 8-3-3M16 8l-3 3" />
								</svg>
							</button>

							<label className="flex flex-1 items-center gap-2 text-xs text-muted">
								Zoom
								<input
									type="range"
									min={1}
									max={MAX_ZOOM}
									step={0.01}
									value={zoom}
									onChange={(event) => setZoom(Number(event.target.value))}
									className="w-full accent-matcha"
								/>
							</label>
						</div>
					</div>

					<div className="flex flex-col gap-4">
						<div>
							<span className="text-xs text-muted">Filtre</span>
							<ul className="mt-2 flex flex-wrap gap-2">
								{FILTERS.map((entry) => (
									<li key={entry.key}>
										<button
											type="button"
											onClick={() => setPreset(entry.key)}
											aria-pressed={preset === entry.key}
											className={`cursor-pointer rounded-full border px-3 py-1.5 text-sm transition-colors duration-200 ease-out ${
												preset === entry.key
													? "border-matcha bg-matcha font-medium text-white"
													: "border-edge/60 bg-white/70 hover:border-matcha/50 hover:bg-leaf/40"
											}`}
										>
											{entry.label}
										</button>
									</li>
								))}
							</ul>
						</div>

						<div className="flex flex-col gap-2 text-xs text-muted">
							<label className="flex items-center gap-3">
								<span className="w-20">Luminosité</span>
								<input
									type="range"
									min={0.6}
									max={1.4}
									step={0.01}
									value={adjust.brightness}
									onChange={(event) =>
										setAdjust((current) => ({
											...current,
											brightness: Number(event.target.value),
										}))}
									className="w-full accent-matcha"
								/>
							</label>
							<label className="flex items-center gap-3">
								<span className="w-20">Contraste</span>
								<input
									type="range"
									min={0.6}
									max={1.6}
									step={0.01}
									value={adjust.contrast}
									onChange={(event) =>
										setAdjust((current) => ({
											...current,
											contrast: Number(event.target.value),
										}))}
									className="w-full accent-matcha"
								/>
							</label>
							<label className="flex items-center gap-3">
								<span className="w-20">Saturation</span>
								<input
									type="range"
									min={0}
									max={2}
									step={0.01}
									value={adjust.saturate}
									onChange={(event) =>
										setAdjust((current) => ({
											...current,
											saturate: Number(event.target.value),
										}))}
									className="w-full accent-matcha"
								/>
							</label>
						</div>

						{error !== null ? <Alert>{error}</Alert> : null}

						<div className="mt-auto flex flex-wrap justify-end gap-3">
							<button
								type="button"
								onClick={reset}
								className="cursor-pointer text-sm text-muted underline decoration-edge/50 underline-offset-4 hover:text-ink"
							>
								Réinitialiser
							</button>
							<div className="w-32">
								<ActionButton type="button" tone="secondary" onClick={onCancel}>
									Annuler
								</ActionButton>
							</div>
							<div className="w-40">
								<ActionButton
									type="button"
									tone="primary"
									busy={busy}
									disabled={!ready}
									onClick={apply}
								>
									Enregistrer
								</ActionButton>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
