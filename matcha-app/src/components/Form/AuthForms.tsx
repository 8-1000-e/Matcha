"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";
import { GoogleIcon, Intra42Icon } from "@/components/Brand/ProviderLogos";
import { Alert } from "@/components/Form/Alert";
import { ActionButton } from "@/components/Form/Button";
import { Notice } from "@/components/Form/Notice";
import { PasswordField } from "@/components/Form/PasswordField";
import { TextField } from "@/components/Form/TextField";
import {
	login,
	register,
	requestPasswordReset,
	resendVerification,
	resetPassword,
} from "@/lib/auth/api";
import type { AuthError, AuthField } from "@/lib/auth/errorMessages";

const PROVIDERS = [
	{ id: "google", name: "Google", Icon: GoogleIcon },
	{ id: "intra42", name: "Intra 42", Icon: Intra42Icon },
] as const;

const MINIMUM_AGE = 18;

const LINK_SENT
	= "Si cette adresse correspond à un compte, un lien vient d’être envoyé. Il expire dans quinze minutes.";

type FormState = {
	errors: AuthError[];
	values: Partial<Record<AuthField, string>>;
	sent?: boolean;
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
				hint="Un lien de vérification y sera envoyé."
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

			router.push(result.data.user.is_verified ? "/me" : "/verify-email");
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

export function ResendVerificationForm() {
	const [state, action, pending] = useActionState(
		async (_previous: FormState, formData: FormData): Promise<FormState> => {
			const email = read(formData, "email");
			const result = await resendVerification(email);
			if (!result.ok) {
				return { errors: result.errors, values: { email } };
			}

			return { errors: [], values: { email }, sent: true };
		},
		CLEAN,
	);

	if (state.sent) {
		return <Notice>{LINK_SENT}</Notice>;
	}

	return (
		<form action={action} className="flex flex-col gap-4">
			<p className="text-xs text-muted">
				Indiquez l’adresse du compte pour recevoir un nouveau lien de
				vérification.
			</p>

			<TextField
				id="resendEmail"
				name="email"
				label="Adresse e-mail"
				type="email"
				autoComplete="email"
				defaultValue={state.values.email}
				error={fieldError(state, "email")}
			/>

			<GlobalAlert state={state} />

			<ActionButton type="submit" tone="secondary" disabled={pending}>
				{pending ? "Envoi…" : "Renvoyer le lien"}
			</ActionButton>
		</form>
	);
}

export function ForgotPasswordForm() {
	const [state, action, pending] = useActionState(
		async (_previous: FormState, formData: FormData): Promise<FormState> => {
			const email = read(formData, "email");
			const result = await requestPasswordReset(email);
			if (!result.ok) {
				return { errors: result.errors, values: { email } };
			}

			return { errors: [], values: { email }, sent: true };
		},
		CLEAN,
	);

	if (state.sent) {
		return (
			<div className="flex flex-col gap-6">
				<Notice>{LINK_SENT}</Notice>
				<Link href="/login" className="text-center text-sm text-matcha underline">
					Retour à la connexion
				</Link>
			</div>
		);
	}

	return (
		<form action={action} className="flex flex-col gap-5">
			<TextField
				id="email"
				label="Adresse e-mail"
				type="email"
				autoComplete="email"
				defaultValue={state.values.email}
				error={fieldError(state, "email")}
			/>

			<GlobalAlert state={state} />

			<ActionButton
				type="submit"
				tone="primary"
				className="mt-1"
				disabled={pending}
			>
				{pending ? "Envoi…" : "Envoyer le lien"}
			</ActionButton>
		</form>
	);
}

export function ResetPasswordForm({ token }: { token: string }) {
	const router = useRouter();

	const [state, action, pending] = useActionState(
		async (_previous: FormState, formData: FormData): Promise<FormState> => {
			const password = read(formData, "password");
			const result = await resetPassword({ token, password });
			if (!result.ok) {
				return { errors: result.errors, values: { password } };
			}

			router.push("/login?reset=1");
			return CLEAN;
		},
		CLEAN,
	);

	if (token.length === 0) {
		return (
			<div className="flex flex-col gap-6">
				<Alert>
					Ce lien est incomplet. Demandez un nouvel e-mail de réinitialisation.
				</Alert>
				<Link
					href="/forgot-password"
					className="text-center text-sm text-matcha underline"
				>
					Demander un nouveau lien
				</Link>
			</div>
		);
	}

	return (
		<form action={action} className="flex flex-col gap-6">
			<PasswordField
				label="Nouveau mot de passe"
				defaultValue={state.values.password}
				error={fieldError(state, "password")}
			/>

			<GlobalAlert state={state} />

			<ActionButton
				type="submit"
				tone="primary"
				className="mt-1"
				disabled={pending}
			>
				{pending ? "Enregistrement…" : "Changer mon mot de passe"}
			</ActionButton>
		</form>
	);
}
