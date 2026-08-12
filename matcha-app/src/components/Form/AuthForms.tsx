"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, type ReactNode, useState } from "react";
import { GoogleIcon, Intra42Icon } from "@/components/Brand/ProviderLogos";
import { ActionButton } from "@/components/Form/Button";
import { TextField } from "@/components/Form/TextField";

const PROVIDERS = [
	{ id: "google", name: "Google", Icon: GoogleIcon },
	{ id: "intra42", name: "Intra 42", Icon: Intra42Icon },
] as const;

export function OauthGroup() {
	const [notice, setNotice] = useState("");

	return (
		<div className="flex flex-col gap-3">
			{PROVIDERS.map(({ id, name, Icon }) => (
				<ActionButton
					key={id}
					type="button"
					tone="secondary"
					onClick={() => setNotice(`${name} arrive avec le back-end.`)}
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

type StepFormProps = {
	next: string;
	label: string;
	children: ReactNode;
};

export function StepForm({ next, label, children }: StepFormProps) {
	const router = useRouter();

	function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		router.push(next);
	}

	return (
		<form onSubmit={handleSubmit} className="flex flex-col gap-6">
			{children}
			<ActionButton type="submit" tone="primary" className="mt-2">
				{label}
			</ActionButton>
		</form>
	);
}

export function LoginForm() {
	const [notice, setNotice] = useState("");

	function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setNotice("La connexion arrive avec le back-end.");
	}

	return (
		<form onSubmit={handleSubmit} className="flex flex-col gap-5">
			<TextField
				id="identifier"
				label="Nom d’utilisateur ou e-mail"
				autoComplete="username"
				minLength={3}
			/>
			<TextField
				id="password"
				label="Mot de passe"
				type="password"
				autoComplete="current-password"
			/>

			<p role="status" className="text-xs text-muted empty:hidden">
				{notice}
			</p>

			<ActionButton type="submit" tone="primary" className="mt-1">
				Se connecter
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
