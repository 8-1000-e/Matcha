"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Alert } from "@/components/Form/Alert";
import { LoginForm, OauthGroup } from "@/components/Form/AuthForms";
import { TextLink } from "@/components/Form/Button";
import { Notice } from "@/components/Form/Notice";
import { FlowScreen } from "@/components/Layout/Screen";
import type { OauthFeedback } from "@/lib/oauth/messages";

const NOTICES = {
	created:
		"Compte créé. Un lien de vérification vient de partir : ouvrez-le avant de vous connecter.",
	verified: "Adresse vérifiée. Vous pouvez vous connecter.",
	reset: "Mot de passe changé. Connectez-vous avec le nouveau.",
} as const;

export type LoginNotice = keyof typeof NOTICES;

export function LoginPage({
	notice,
	oauthMessage,
}: {
	notice?: LoginNotice;
	oauthMessage?: OauthFeedback;
}) {
	useEffect(() => {
		if (oauthMessage === undefined) {
			return;
		}
		const url = new URL(window.location.href);
		url.searchParams.delete("oauth");
		window.history.replaceState(null, "", url.toString());
	}, [oauthMessage]);

	return (
		<FlowScreen
			back="/"
			title="Se connecter"
			footer={
				<span className="block text-center">
					Pas de compte ?{" "}
					<Link href="/signup" className="inline-block py-2 font-medium text-matcha underline decoration-matcha/40 underline-offset-4 transition-colors duration-200 ease-out hover:decoration-matcha">
						Créer un compte
					</Link>
				</span>
			}
		>
			<div className="flex flex-col gap-6">
				{notice ? <Notice>{NOTICES[notice]}</Notice> : null}
				{oauthMessage ? (
					oauthMessage.tone === "success" ? (
						<Notice>{oauthMessage.text}</Notice>
					) : (
						<Alert>{oauthMessage.text}</Alert>
					)
				) : null}

				<OauthGroup />
				<LoginForm />
				<TextLink href="/forgot-password" className="self-center text-muted">
					Mot de passe oublié ?
				</TextLink>
			</div>
		</FlowScreen>
	);
}
