"use client";

import { useRef, useState, type PointerEvent, type ReactNode } from "react";

const THRESHOLD = 80;
const MAX_TILT = 12;

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

	function begin(event: PointerEvent<HTMLDivElement>) {
		if (event.button !== 0) {
			return;
		}
		origin.current = event.clientX;
		setDragging(true);
		event.currentTarget.setPointerCapture(event.pointerId);
	}

	function move(event: PointerEvent<HTMLDivElement>) {
		if (origin.current === null) {
			return;
		}
		setDx(event.clientX - origin.current);
	}

	function end(event: PointerEvent<HTMLDivElement>) {
		if (origin.current === null) {
			return;
		}
		const travel = event.clientX - origin.current;
		origin.current = null;
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
			<div className="flex shrink-0 items-center">
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

			<div className="flex shrink-0 items-center">
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
