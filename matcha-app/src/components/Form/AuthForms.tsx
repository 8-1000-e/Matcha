"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useActionState, useState } from "react";
import { GoogleIcon, Intra42Icon } from "@/components/Brand/ProviderLogos";
import { Alert } from "@/components/Form/Alert";
import { ActionButton } from "@/components/Form/Button";
import { PasswordField } from "@/components/Form/PasswordField";
import { TextField } from "@/components/Form/TextField";
import { login, register } from "@/lib/auth/api";
import type { AuthError, AuthField } from "@/lib/auth/errorMessages";

const PROVIDERS = [
	{ id: "google", name: "Google", Icon: GoogleIcon },
	{ id: "intra42", name: "Intra 42", Icon: Intra42Icon },
] as const;

const MINIMUM_AGE = 18;

type FormState = {
	errors: AuthError[];
	values: Partial<Record<AuthField, string>>;
};

const CLEAN: FormState = { errors: [], values: {} };

function read(formData: FormData, name: AuthField) {
	const value = formData.get(name);
	return typeof value === "string" ? value : "";
}

function fieldError(state: FormState, field: AuthField) {
	return state.errors.find((entry) => entry.field === field)?.message;
}

function isOldEnough(birthDate: string) {
	const birth = new Date(`${birthDate}T00:00:00Z`);
	if (Number.isNaN(birth.getTime())) {
		return false;
	}

	const limit = new Date();
	limit.setUTCFullYear(limit.getUTCFullYear() - MINIMUM_AGE);
	limit.setUTCHours(0, 0, 0, 0);

	return birth <= limit;
}

function GlobalAlert({ state }: { state: FormState }) {
	const messages = state.errors
		.filter((entry) => entry.field === null)
		.map((entry) => entry.message);

	if (messages.length === 0) {
		return null;
	}

	return <Alert>{messages.join(" ")}</Alert>;
}

export function OauthGroup() {
	const [notice, setNotice] = useState("");

	return (
		<div className="flex flex-col gap-3">
			{PROVIDERS.map(({ id, name, Icon }) => (
				<ActionButton
					key={id}
					type="button"
					tone="secondary"
					onClick={() => setNotice(`${name} arrive plus tard.`)}
				>
					<Icon className="size-5 shrink-0" />
					Continuer avec {name}
				</ActionButton>
			))}

			<p role="status" className="text-xs text-muted empty:hidden">
				{notice}
			</p>
		</div>
	);
}

export function SignupForm() {
	const router = useRouter();

	const [state, action, pending] = useActionState(
		async (_previous: FormState, formData: FormData): Promise<FormState> => {
			const fields = {
				first_name: read(formData, "first_name"),
				last_name: read(formData, "last_name"),
				username: read(formData, "username"),
				email: read(formData, "email"),
				birth_date: read(formData, "birth_date"),
				password: read(formData, "password"),
			};

			if (!isOldEnough(fields.birth_date)) {
				return {
					errors: [
						{
							field: "birth_date",
							message: `Vous devez avoir ${MINIMUM_AGE} ans ou plus.`,
						},
					],
					values: fields,
				};
			}

			const result = await register(fields);
			if (!result.ok) {
				return { errors: result.errors, values: fields };
			}

			router.push("/login?created=1");
			return CLEAN;
		},
		CLEAN,
	);

	return (
		<form action={action} className="flex flex-col gap-6">
			<div className="grid grid-cols-2 gap-3">
				<TextField
					id="firstName"
					name="first_name"
					label="Prénom"
					autoComplete="given-name"
					defaultValue={state.values.first_name}
					error={fieldError(state, "first_name")}
				/>
				<TextField
					id="lastName"
					name="last_name"
					label="Nom"
					autoComplete="family-name"
					defaultValue={state.values.last_name}
					error={fieldError(state, "last_name")}
				/>
			</div>

			<TextField
				id="username"
				label="Nom d’utilisateur"
				autoComplete="username"
				minLength={3}
				defaultValue={state.values.username}
				error={fieldError(state, "username")}
			/>

			<TextField
				id="email"
				label="Adresse e-mail"
				type="email"
				autoComplete="email"
				defaultValue={state.values.email}
				error={fieldError(state, "email")}
			/>

			<TextField
				id="birthDate"
				name="birth_date"
				label="Date de naissance"
				type="date"
				autoComplete="bday"
				hint={`Vous devez avoir ${MINIMUM_AGE} ans ou plus.`}
				defaultValue={state.values.birth_date}
				error={fieldError(state, "birth_date")}
			/>

			<PasswordField
				defaultValue={state.values.password}
				error={fieldError(state, "password")}
			/>

			<GlobalAlert state={state} />

			<ActionButton
				type="submit"
				tone="primary"
				className="mt-2"
				disabled={pending}
			>
				{pending ? "Création du compte…" : "Créer mon compte"}
			</ActionButton>
		</form>
	);
}

export function LoginForm() {
	const router = useRouter();

	const [state, action, pending] = useActionState(
		async (_previous: FormState, formData: FormData): Promise<FormState> => {
			const fields = {
				username: read(formData, "username"),
				password: read(formData, "password"),
			};

			const result = await login(fields);
			if (!result.ok) {
				return { errors: result.errors, values: fields };
			}

			router.push("/");
			router.refresh();
			return CLEAN;
		},
		CLEAN,
	);

	return (
		<form action={action} className="flex flex-col gap-5">
			<TextField
				id="username"
				label="Nom d’utilisateur"
				autoComplete="username"
				minLength={3}
				defaultValue={state.values.username}
				error={fieldError(state, "username")}
			/>
			<TextField
				id="password"
				label="Mot de passe"
				type="password"
				autoComplete="current-password"
				defaultValue={state.values.password}
				error={fieldError(state, "password")}
				reveal
			/>

			<GlobalAlert state={state} />

			<ActionButton
				type="submit"
				tone="primary"
				className="mt-1"
				disabled={pending}
			>
				{pending ? "Connexion…" : "Se connecter"}
			</ActionButton>
		</form>
	);
}

export function ForgotPasswordForm() {
	const [notice, setNotice] = useState("");

	function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setNotice("L’envoi du lien arrive avec le back-end.");
	}

	return (
		<form onSubmit={handleSubmit} className="flex flex-col gap-5">
			<TextField
				id="email"
				label="Adresse e-mail"
				type="email"
				autoComplete="email"
			/>

			<p role="status" className="text-xs text-muted empty:hidden">
				{notice}
			</p>

			<ActionButton type="submit" tone="primary" className="mt-1">
				Envoyer le lien
			</ActionButton>
		</form>
	);
}
