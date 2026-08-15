"use client";

import { useEffect } from "react";
import { useCall } from "./CallProvider";

const VISIBLE_MS = 9000;

export function CallError() {
	const { error, dismissError } = useCall();

	useEffect(() => {
		if (error === null) {
			return;
		}
		const timer = window.setTimeout(dismissError, VISIBLE_MS);
		return () => {
			window.clearTimeout(timer);
		};
	}, [error, dismissError]);

	if (error === null) {
		return null;
	}

	return (
		<div
			role="alert"
			className="fixed inset-x-0 bottom-4 z-50 mx-auto flex w-full max-w-md items-start gap-3 rounded-xl border border-edge/60 bg-white px-4 py-3 shadow-lg"
		>
			<p className="min-w-0 flex-1 text-sm break-words text-ink">{error}</p>
			<button
				type="button"
				onClick={dismissError}
				aria-label="Fermer"
				className="shrink-0 cursor-pointer rounded-lg px-2 py-0.5 text-muted transition-colors duration-200 ease-out hover:bg-leaf/40"
			>
				×
			</button>
		</div>
	);
}
