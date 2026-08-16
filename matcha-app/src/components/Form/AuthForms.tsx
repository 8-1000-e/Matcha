"use client";

import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";
import { GoogleIcon, Intra42Icon } from "@/components/Brand/ProviderLogos";
import { Alert } from "@/components/Form/Alert";
import { ActionButton, TextLink } from "@/components/Form/Button";
import {
	birthDateBounds,
	EMAIL_MAX,
	isOldEnough,
	MINIMUM_AGE,
	NAME_MAX,
	NAME_MESSAGE,
	NAME_PATTERN,
	USERNAME_MAX,
	USERNAME_MESSAGE,
	USERNAME_MIN,
	USERNAME_PATTERN,
} from "@/components/Form/constraints";
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

function GlobalAlert({ state }: { state: FormState }) {
	const messages = state.errors
		.filter((entry) => entry.field === null)
		.map((entry) => entry.message);

	if (messages.length === 0) {
		return null;
	}

	return <Alert>{messages.join(" ")}</Alert>;
}
const EMAIL_INPUT = {
	type: "email",
	autoComplete: "email",
	inputMode: "email",
	autoCapitalize: "none",
	spellCheck: false,
	maxLength: EMAIL_MAX,
} as const;

const USERNAME_INPUT = {
	autoComplete: "username",
	autoCapitalize: "none",
	spellCheck: false,
	minLength: USERNAME_MIN,
	maxLength: USERNAME_MAX,
	pattern: USERNAME_PATTERN,
	patternMessage: USERNAME_MESSAGE,
} as const;

const NAME_INPUT = {
	autoCapitalize: "words",
	spellCheck: false,
	maxLength: NAME_MAX,
	pattern: NAME_PATTERN,
	patternMessage: NAME_MESSAGE,
} as const;

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
	const bounds = birthDateBounds();

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

			router.push(
				result.data.verification_email_sent
					? "/verify-email"
					: "/verify-email?mail=failed",
			);
			return CLEAN;
		},
		CLEAN,
	);

	return (
		<form action={action} className="flex flex-col gap-5">
			<div className="grid grid-cols-1 gap-5 min-[22rem]:grid-cols-2 min-[22rem]:gap-3">
				<TextField
					id="firstName"
					name="first_name"
					label="Prénom"
					autoComplete="given-name"
					{...NAME_INPUT}
					defaultValue={state.values.first_name}
					error={fieldError(state, "first_name")}
				/>
				<TextField
					id="lastName"
					name="last_name"
					label="Nom"
					autoComplete="family-name"
					{...NAME_INPUT}
					defaultValue={state.values.last_name}
					error={fieldError(state, "last_name")}
				/>
			</div>

			<TextField
				id="username"
				label="Nom d’utilisateur"
				{...USERNAME_INPUT}
				hint={`De ${USERNAME_MIN} à ${USERNAME_MAX} caractères : lettres, chiffres, point, tiret et tiret bas.`}
				defaultValue={state.values.username}
				error={fieldError(state, "username")}
			/>

			<TextField
				id="email"
				label="Adresse e-mail"
				{...EMAIL_INPUT}
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
				min={bounds.min}
				max={bounds.max}
				hint={`Vous devez avoir ${MINIMUM_AGE} ans ou plus.`}
				defaultValue={state.values.birth_date}
				error={fieldError(state, "birth_date")}
			/>

			<PasswordField
				defaultValue={state.values.password}
				error={fieldError(state, "password")}
			/>

			<GlobalAlert state={state} />

			<ActionButton type="submit" tone="primary" className="mt-1" busy={pending}>
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

			router.push(result.data.user.is_verified ? "/feed" : "/verify-email");
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
				autoCapitalize="none"
				spellCheck={false}
				maxLength={USERNAME_MAX}
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

			<ActionButton type="submit" tone="primary" className="mt-1" busy={pending}>
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
		<form action={action} className="flex flex-col gap-5">
			<p className="text-xs text-muted">
				Indiquez l’adresse du compte pour recevoir un nouveau lien de
				vérification.
			</p>

			<TextField
				id="resendEmail"
				name="email"
				label="Adresse e-mail"
				{...EMAIL_INPUT}
				defaultValue={state.values.email}
				error={fieldError(state, "email")}
			/>

			<GlobalAlert state={state} />

			<ActionButton type="submit" tone="secondary" className="mt-1" busy={pending}>
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
			<div className="flex flex-col items-center gap-4">
				<Notice className="w-full">{LINK_SENT}</Notice>
				<TextLink href="/login" className="text-matcha">
					Retour à la connexion
				</TextLink>
			</div>
		);
	}

	return (
		<form action={action} className="flex flex-col gap-5">
			<TextField
				id="email"
				label="Adresse e-mail"
				{...EMAIL_INPUT}
				defaultValue={state.values.email}
				error={fieldError(state, "email")}
			/>

			<GlobalAlert state={state} />

			<ActionButton type="submit" tone="primary" className="mt-1" busy={pending}>
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
			<div className="flex flex-col items-center gap-4">
				<Alert className="w-full">
					Ce lien est incomplet. Demandez un nouvel e-mail de réinitialisation.
				</Alert>
				<TextLink href="/forgot-password" className="text-matcha">
					Demander un nouveau lien
				</TextLink>
			</div>
		);
	}

	return (
		<form action={action} className="flex flex-col gap-5">
			<PasswordField
				label="Nouveau mot de passe"
				defaultValue={state.values.password}
				error={fieldError(state, "password")}
			/>

			<GlobalAlert state={state} />

			<ActionButton type="submit" tone="primary" className="mt-1" busy={pending}>
				{pending ? "Enregistrement…" : "Changer mon mot de passe"}
			</ActionButton>
		</form>
	);
}