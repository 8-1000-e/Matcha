"use client";

import { useRef, useState, type ReactNode } from "react";

const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];

export function PhotoDropZone({
	onFile,
	disabled = false,
	full = false,
	children,
}: {
	onFile: (file: File) => void;
	disabled?: boolean;
	full?: boolean;
	children: ReactNode;
}) {
	const depth = useRef(0);
	const [over, setOver] = useState(false);
	const [refused, setRefused] = useState<string | null>(null);

	function leave() {
		depth.current = 0;
		setOver(false);
	}

	function enter(event: React.DragEvent) {
		if (!event.dataTransfer.types.includes("Files")) {
			return;
		}
		event.preventDefault();
		depth.current += 1;
		setRefused(null);
		setOver(true);
	}

	function exit(event: React.DragEvent) {
		event.preventDefault();
		depth.current -= 1;
		if (depth.current <= 0) {
			leave();
		}
	}

	function drop(event: React.DragEvent) {
		event.preventDefault();
		leave();

		const file = event.dataTransfer.files[0];
		if (file === undefined) {
			return;
		}
		if (disabled) {
			setRefused(full
				? "Vous avez déjà cinq photos. Supprimez-en une avant d’en ajouter."
				: "Envoi en cours, réessayez dans un instant.");
			return;
		}
		if (!ACCEPTED.includes(file.type)) {
			setRefused("Formats acceptés : JPEG, PNG ou WebP.");
			return;
		}

		onFile(file);
	}

	return (
		<div
			onDragEnter={enter}
			onDragOver={(event) => {
				if (event.dataTransfer.types.includes("Files")) {
					event.preventDefault();
					event.dataTransfer.dropEffect = disabled ? "none" : "copy";
				}
			}}
			onDragLeave={exit}
			onDrop={drop}
			className="relative"
		>
			{children}

			{over ? (
				<div
					aria-hidden="true"
					className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-matcha bg-cream/90 text-center"
				>
					<svg
						viewBox="0 0 24 24"
						className="size-7 text-matcha"
						fill="none"
						stroke="currentColor"
						strokeWidth="1.7"
						strokeLinecap="round"
						strokeLinejoin="round"
					>
						<path d="M12 16V4" />
						<path d="m7 9 5-5 5 5" />
						<path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
					</svg>
					<p className="text-sm font-medium">
						{disabled ? "Ajout impossible" : "Déposez pour retoucher"}
					</p>
				</div>
			) : null}

			{refused !== null ? (
				<p className="mt-2 text-xs text-muted" role="status">
					{refused}
				</p>
			) : null}
		</div>
	);
}
