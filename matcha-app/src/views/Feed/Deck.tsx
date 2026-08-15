"use client";

import { useRef, useState, type PointerEvent, type ReactNode } from "react";

const THRESHOLD = 80;
const SLOP = 10;
const MAX_TILT = 12;
const INTERACTIVE = "a, button, input, select, textarea, [role='button']";

export function Deck({
	children,
	canGoBack,
	canGoForward,
	liked,
	onBack,
	onForward,
	onLike,
}: {
	children: ReactNode;
	canGoBack: boolean;
	canGoForward: boolean;
	liked: boolean;
	onBack: () => void;
	onForward: () => void;
	onLike: () => void;
}) {
	const [dx, setDx] = useState(0);
	const [dragging, setDragging] = useState(false);
	const origin = useRef<number | null>(null);
	const captured = useRef(false);

	function begin(event: PointerEvent<HTMLDivElement>) {
		if (event.button !== 0) {
			return;
		}
		if ((event.target as Element).closest(INTERACTIVE) !== null) {
			return;
		}
		origin.current = event.clientX;
	}

	function move(event: PointerEvent<HTMLDivElement>) {
		if (origin.current === null) {
			return;
		}

		const travel = event.clientX - origin.current;
		if (!captured.current && Math.abs(travel) < SLOP) {
			return;
		}
		if (!captured.current) {
			captured.current = true;
			setDragging(true);
			event.currentTarget.setPointerCapture(event.pointerId);
		}
		setDx(travel);
	}

	function end(event: PointerEvent<HTMLDivElement>) {
		if (origin.current === null) {
			return;
		}
		const travel = captured.current ? event.clientX - origin.current : 0;
		origin.current = null;
		captured.current = false;
		setDragging(false);
		setDx(0);

		if (travel >= THRESHOLD) {
			onLike();
			onForward();
			return;
		}
		if (travel <= -THRESHOLD) {
			onForward();
		}
	}

	const strength = Math.min(1, Math.abs(dx) / THRESHOLD);
	const intent = Math.abs(dx) < SLOP ? null : dx > 0 ? "like" : "skip";
	const stamp
		= "pointer-events-none absolute top-4 z-20 rounded-xl border-2 px-3 py-1"
		+ " text-base font-bold tracking-wide uppercase transition-opacity";

	const arrow ="flex size-11 shrink-0 cursor-pointer items-center justify-center"
		+ " rounded-full bg-white text-xl text-ink ring-1 ring-edge/40 transition"
		+ " hover:bg-leaf/40 disabled:cursor-default disabled:text-muted/40"
		+ " disabled:ring-edge/20 disabled:hover:bg-white";

	return (
		<div className="flex min-h-0 flex-1 items-stretch gap-3">
			<div className="hidden shrink-0 items-center sm:flex">
				<button
					type="button"
					className={arrow}
					disabled={!canGoBack}
					aria-label="Profil précédent"
					onClick={onBack}
				>
					‹
				</button>
			</div>

			<div
				className="relative flex min-h-0 min-w-0 flex-1 items-center justify-center touch-pan-y select-none"
				onPointerDown={begin}
				onPointerMove={move}
				onPointerUp={end}
				onPointerCancel={end}
				style={{
					transform: `translateX(${dx}px) rotate(${
						Math.max(-MAX_TILT, Math.min(MAX_TILT, dx / 12))
					}deg)`,
					opacity: 1 - Math.min(0.4, Math.abs(dx) / 600),
					transition: dragging ? "none" : "transform 200ms ease-out, opacity 200ms ease-out",
				}}
			>
				<span
					aria-hidden="true"
					className={`${stamp} left-4 -rotate-12 border-matcha bg-white/90 text-matcha-dark`}
					style={{ opacity: intent === "like" ? strength : 0 }}
				>
					J’aime
				</span>

				<span
					aria-hidden="true"
					className={`${stamp} right-4 rotate-12 border-edge bg-white/90 text-muted`}
					style={{ opacity: intent === "skip" ? strength : 0 }}
				>
					Passer
				</span>

				{liked && intent === null ? (
					<span className="pointer-events-none absolute top-4 left-4 z-20 inline-flex items-center gap-1.5 rounded-full bg-matcha px-3 py-1 text-xs font-medium text-white">
						<svg viewBox="0 0 20 20" aria-hidden="true" className="size-3.5">
							<path
								d="M10 17S2.5 12.5 2.5 7.6A4.1 4.1 0 0 1 10 5.3a4.1 4.1 0 0 1 7.5 2.3C17.5 12.5 10 17 10 17Z"
								fill="currentColor"
							/>
						</svg>
						Liké
					</span>
				) : null}

				{children}
			</div>

			<div className="hidden shrink-0 items-center sm:flex">
				<button
					type="button"
					className={arrow}
					disabled={!canGoForward}
					aria-label="Profil suivant"
					onClick={onForward}
				>
					›
				</button>
			</div>
		</div>
	);
}
