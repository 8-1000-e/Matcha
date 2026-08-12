"use client";

import { useState } from "react";
import { MatchaBowl } from "@/components/Brand/Brand";
import { TextField } from "@/components/Form/TextField";

export const PASSWORD_PATTERN = "(?=.*\\d)(?=.*[^A-Za-z0-9]).{8,}";

const RULES = [
	{ label: "8 caractères", test: (value: string) => value.length >= 8 },
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
	const score = met === RULES.length && value.length >= 12 ? 4 : met;
	return { passed, score };
}

export function PasswordField() {
	const [value, setValue] = useState("");

	const { passed, score } = grade(value);
	const empty = value.length === 0;
	const stage = STAGES[score];

	return (
		<div>
			<TextField
				id="password"
				label="Mot de passe"
				type="password"
				autoComplete="new-password"
				minLength={8}
				pattern={PASSWORD_PATTERN}
				patternMessage="Ajoutez un chiffre et un caractère spécial."
				describedBy="password-strength password-rules"
				onValue={setValue}
			/>

			<div className="mt-3 flex items-center gap-2.5">
				<span aria-hidden="true" className="flex flex-1 gap-1.5">
					{STAGES.slice(1).map((step, index) => (
						<span
							key={step.label}
							className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ease-out ${
								!empty && index < score ? stage.fill : "bg-edge/20"
							}`}
						/>
					))}
				</span>

				{score === 4 ? <MatchaBowl className="size-4 shrink-0" /> : null}

				<span
					id="password-strength"
					role="status"
					className={`shrink-0 text-xs font-medium ${
						empty ? "text-muted" : stage.text
					}`}
				>
					{empty ? "Bol vide" : stage.label}
				</span>
			</div>

			<ul id="password-rules" className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
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
						{rule.label}
					</li>
				))}
			</ul>

			<p className="mt-2.5 text-xs text-muted">
				Douze caractères ou plus pour un matcha bien fouetté.
			</p>
		</div>
	);
}
