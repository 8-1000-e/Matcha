"use client";

import { useState } from "react";
import { MatchaBowl } from "@/components/Brand/Brand";
import {
	PASSWORD_MESSAGE,
	PASSWORD_MIN,
	PASSWORD_PATTERN,
	PASSWORD_STRONG,
} from "@/components/Form/constraints";
import { TextField } from "@/components/Form/TextField";

const RULES = [
	{
		label: `${PASSWORD_MIN} caractères`,
		test: (value: string) => value.length >= PASSWORD_MIN,
	},
	{ label: "un chiffre", test: (value: string) => /\d/.test(value) },
	{
		label: "un caractère spécial",
		test: (value: string) => /[^A-Za-z0-9]/.test(value),
	},
] as const;

const STAGES = [
	{ label: "Eau glacée", fill: "bg-red-300", text: "text-red-800" },
	{ label: "Eau froide", fill: "bg-red-300", text: "text-red-800" },
	{ label: "Eau tiède", fill: "bg-leaf", text: "text-muted" },
	{ label: "Eau à 80 °C", fill: "bg-matcha/60", text: "text-matcha" },
	{ label: "Matcha fouetté", fill: "bg-matcha", text: "text-matcha" },
] as const;

function grade(value: string) {
	const passed = RULES.map((rule) => rule.test(value));
	const met = passed.filter(Boolean).length;
	const score =
		met === RULES.length && value.length >= PASSWORD_STRONG ? 4 : met;
	return { passed, score };
}

type PasswordFieldProps = {
	id?: string;
	label?: string;
	defaultValue?: string;
	error?: string;
};

export function PasswordField({
	id = "password",
	label = "Mot de passe",
	defaultValue,
	error,
}: PasswordFieldProps) {
	const [value, setValue] = useState(defaultValue ?? "");

	const { passed, score } = grade(value);
	const empty = value.length === 0;
	const stage = STAGES[score];
	const strengthId = `${id}-strength`;
	const rulesId = `${id}-rules`;

	return (
		<div>
			<TextField
				id={id}
				name="password"
				label={label}
				type="password"
				autoComplete="new-password"
				minLength={PASSWORD_MIN}
				pattern={PASSWORD_PATTERN}
				patternMessage={PASSWORD_MESSAGE}
				describedBy={`${strengthId} ${rulesId}`}
				defaultValue={defaultValue}
				error={error}
				reveal
				onValue={setValue}
			/>

			<div className="mt-3 flex items-center gap-2.5">
				<span aria-hidden="true" className="flex min-w-0 flex-1 gap-1.5">
					{STAGES.slice(1).map((step, index) => (
						<span
							key={step.label}
							className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ease-out ${
								!empty && index < score ? stage.fill : "bg-edge/25"
							}`}
						/>
					))}
				</span>

				{score === 4 ? <MatchaBowl className="size-4 shrink-0" /> : null}

				<span
					id={strengthId}
					className={`shrink-0 text-xs font-medium ${
						empty ? "text-muted" : stage.text
					}`}
				>
					{empty ? "Bol vide" : stage.label}
				</span>
			</div>

			<ul id={rulesId} className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
				{RULES.map((rule, index) => (
					<li
						key={rule.label}
						className={`flex items-center gap-1.5 text-xs transition-colors duration-200 ease-out ${
							passed[index] ? "text-matcha" : "text-muted"
						}`}
					>
						<svg
							viewBox="0 0 12 12"
							aria-hidden="true"
							className="size-3 shrink-0"
							fill="none"
							stroke="currentColor"
							strokeWidth="1.8"
							strokeLinecap="round"
							strokeLinejoin="round"
						>
							{passed[index] ? (
								<path d="M2 6.4 4.7 9.1 10 3.4" />
							) : (
								<circle cx="6" cy="6" r="1.6" fill="currentColor" stroke="none" />
							)}
						</svg>
						<span className="sr-only">
							{passed[index] ? "Validé :" : "Manquant :"}
						</span>
						{rule.label}
					</li>
				))}
			</ul>

			<p className="mt-2.5 text-xs text-muted">
				Douze caractères ou plus pour un matcha bien fouetté. Les mots anglais
				courants sont refusés, même à l’intérieur du mot de passe.
			</p>
		</div>
	);
}
