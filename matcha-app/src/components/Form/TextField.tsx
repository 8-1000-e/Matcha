"use client";

import { type FormEvent, useState } from "react";
import { Alert } from "@/components/Form/Alert";

type TextFieldProps = {
	id: string;
	label: string;
	name?: string;
	type?: "text" | "email" | "password" | "date";
	autoComplete?: string;
	minLength?: number;
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
					className={`mt-2 w-full rounded-xl border border-edge bg-white/70 py-3 pl-4 text-base transition-colors duration-200 ease-out aria-invalid:border-red-700 aria-invalid:bg-red-50/60 focus-visible:border-matcha ${
						reveal ? "pr-12" : "pr-4"
					}`}
				/>

				{reveal ? (
					<button
						type="button"
						onClick={() => setVisible(!visible)}
						aria-pressed={visible}
						aria-label={
							visible ? "Masquer le mot de passe" : "Afficher le mot de passe"
						}
						className="absolute inset-y-0 right-0 mt-2 flex cursor-pointer items-center rounded-r-xl px-4 text-muted transition-colors duration-200 ease-out hover:text-ink"
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

			{hint && !message ? (
				<p id={hintId} className="mt-2 text-xs text-muted">
					{hint}
				</p>
			) : null}
		</div>
	);
}
