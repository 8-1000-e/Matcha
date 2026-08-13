"use client";

import { type FormEvent, useState } from "react";
import { Alert } from "@/components/Form/Alert";

type TextFieldProps = {
	id: string;
	label: string;
	name?: string;
	type?: "text" | "email" | "password" | "date";
	autoComplete?: string;
	autoCapitalize?: "none" | "sentences" | "words";
	spellCheck?: boolean;
	inputMode?: "text" | "email" | "numeric";
	minLength?: number;
	maxLength?: number;
	min?: string;
	max?: string;
	pattern?: string;
	patternMessage?: string;
	hint?: string;
	optional?: boolean;
	describedBy?: string;
	defaultValue?: string;
	error?: string;
	reveal?: boolean;
	onValue?: (value: string) => void;
};

function plural(count: number, word: string) {
	return `${count} ${word}${count > 1 ? "s" : ""}`;
}

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
		return `Il manque ${plural(missing, "caractère")}.`;
	}
	if (validity.tooLong) {
		const extra = input.value.length - input.maxLength;
		return `Retirez ${plural(extra, "caractère")}.`;
	}
	if (validity.rangeUnderflow) {
		return "Cette date n’est pas plausible.";
	}
	if (validity.rangeOverflow) {
		return "Vous devez avoir 18 ans ou plus.";
	}
	if (validity.badInput) {
		return "Ce format n’est pas valide.";
	}
	if (validity.patternMismatch) {
		return patternMessage ?? "Ce format n’est pas valide.";
	}
	return "";
}

function EyeIcon({ crossed }: { crossed: boolean }) {
	return (
		<svg
			viewBox="0 0 20 20"
			aria-hidden="true"
			className="size-5 shrink-0"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.5"
			strokeLinecap="round"
			strokeLinejoin="round"
		>
			<path d="M1.8 10S4.9 4.8 10 4.8 18.2 10 18.2 10 15.1 15.2 10 15.2 1.8 10 1.8 10Z" />
			<circle cx="10" cy="10" r="2.4" />
			{crossed ? <path d="M3.2 16.8 16.8 3.2" /> : null}
		</svg>
	);
}

export function TextField({
	id,
	label,
	name,
	hint,
	optional = false,
	patternMessage,
	describedBy,
	error,
	reveal = false,
	onValue,
	...input
}: TextFieldProps) {
	const [message, setMessage] = useState(error ?? "");
	const [previous, setPrevious] = useState(error);
	const [visible, setVisible] = useState(false);

	if (previous !== error) {
		setPrevious(error);
		setMessage(error ?? "");
	}

	const showHint = Boolean(hint) && !message;
	const hintId = showHint ? `${id}-hint` : undefined;
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
		<div className="min-w-0">
			<div className="flex items-baseline justify-between gap-3">
				<label htmlFor={id} className="text-sm font-medium">
					{label}
				</label>
				{optional ? (
					<span className="text-xs text-muted">facultatif</span>
				) : null}
			</div>

			<div className="relative">
				<input
					id={id}
					name={name ?? id}
					required={!optional}
					{...input}
					type={reveal && visible ? "text" : input.type}
					onInput={handleInput}
					onBlur={(event) => check(event.currentTarget)}
					onInvalid={(event) => {
						event.preventDefault();
						check(event.currentTarget);
					}}
					aria-invalid={message ? true : undefined}
					aria-describedby={described}
					className={`mt-2 block min-h-12 w-full min-w-0 rounded-xl border border-edge bg-white/70 py-3 pl-4 text-base transition-colors duration-200 ease-out hover:border-matcha/60 focus-visible:border-matcha aria-invalid:border-red-700 aria-invalid:bg-red-50/60 ${
						reveal ? "pr-14" : "pr-4"
					}`}
				/>

				{reveal ? (
					<button
						type="button"
						onClick={() => setVisible(!visible)}
						aria-pressed={visible}
						aria-controls={id}
						aria-label={
							visible ? "Masquer le mot de passe" : "Afficher le mot de passe"
						}
						className="absolute inset-y-0 right-0 mt-2 flex w-12 cursor-pointer items-center justify-center rounded-r-xl text-muted transition-colors duration-200 ease-out hover:text-ink"
					>
						<EyeIcon crossed={visible} />
					</button>
				) : null}
			</div>

			{message ? (
				<Alert id={errorId} className="mt-2">
					{message}
				</Alert>
			) : null}

			{showHint ? (
				<p id={hintId} className="mt-2 text-xs text-muted">
					{hint}
				</p>
			) : null}
		</div>
	);
}
