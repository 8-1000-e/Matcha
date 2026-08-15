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
	onBack,
	onForward,
	onLike,
}: {
	children: ReactNode;
	canGoBack: boolean;
	canGoForward: boolean;
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
				className="min-h-0 flex-1 touch-pan-y select-none"
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
