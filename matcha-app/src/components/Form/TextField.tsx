"use client";

import { type FormEvent, useState } from "react";

type TextFieldProps = {
	id: string;
	label: string;
	type?: "text" | "email" | "password" | "date";
	autoComplete?: string;
	minLength?: number;
	pattern?: string;
	patternMessage?: string;
	hint?: string;
	optional?: boolean;
	describedBy?: string;
	onValue?: (value: string) => void;
};

function describe(input: HTMLInputElement, patternMessage?: string) {
	const { validity } = input;

	if (validity.valueMissing) {
		return "Ce champ est obligatoire.";
	}
	if (validity.typeMismatch) {
		return input.type === "email"
			? "Il manque un arobase ou un nom de domaine."
			: "Ce format n’est pas valide.";
	}
	if (validity.tooShort) {
		const missing = input.minLength - input.value.length;
		return `Il manque ${missing} caractère${missing > 1 ? "s" : ""}.`;
	}
	if (validity.patternMismatch) {
		return patternMessage ?? "Ce format n’est pas valide.";
	}
	return "";
}

export function TextField({
	id,
	label,
	hint,
	optional = false,
	patternMessage,
	describedBy,
	onValue,
	...input
}: TextFieldProps) {
	const [message, setMessage] = useState("");

	const hintId = hint ? `${id}-hint` : undefined;
	const errorId = message ? `${id}-error` : undefined;
	const described =
		[errorId, hintId, describedBy].filter(Boolean).join(" ") || undefined;

	function check(target: HTMLInputElement) {
		setMessage(describe(target, patternMessage));
	}

	function handleInput(event: FormEvent<HTMLInputElement>) {
		const target = event.currentTarget;
		onValue?.(target.value);
		if (message) {
			check(target);
		}
	}

	return (
		<div>
			<div className="flex items-baseline justify-between gap-3">
				<label htmlFor={id} className="text-sm font-medium">
					{label}
				</label>
				{optional ? (
					<span className="text-xs text-muted">facultatif</span>
				) : null}
			</div>

			<input
				id={id}
				name={id}
				required={!optional}
				{...input}
				onInput={handleInput}
				onBlur={(event) => check(event.currentTarget)}
				onInvalid={(event) => {
					event.preventDefault();
					check(event.currentTarget);
				}}
				aria-invalid={message ? true : undefined}
				aria-describedby={described}
				className="mt-2 w-full rounded-xl border border-edge bg-white/70 px-4 py-3 text-base transition-colors duration-200 ease-out aria-invalid:border-red-700 aria-invalid:bg-red-50/60 focus-visible:border-matcha"
			/>

			{message ? (
				<p
					id={errorId}
					role="alert"
					className="popup mt-2 flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2.5 text-xs leading-snug text-red-800 ring-1 ring-red-200"
				>
					<svg
						viewBox="0 0 16 16"
						aria-hidden="true"
						className="mt-px size-4 shrink-0"
						fill="currentColor"
					>
						<path d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13Zm-.75 3h1.5l-.15 4h-1.2l-.15-4Zm.75 5.4a.9.9 0 1 1 0 1.8.9.9 0 0 1 0-1.8Z" />
					</svg>
					{message}
				</p>
			) : null}

			{hint && !message ? (
				<p id={hintId} className="mt-2 text-xs text-muted">
					{hint}
				</p>
			) : null}
		</div>
	);
}
