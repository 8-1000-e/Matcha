import Link from "next/link";
import { LoginForm, OauthGroup } from "@/components/Form/AuthForms";
import { TextLink } from "@/components/Form/Button";
import { Notice } from "@/components/Form/Notice";
import { FlowScreen } from "@/components/Layout/Screen";

const NOTICES = {
	created:
		"Compte créé. Un lien de vérification vient de partir : ouvrez-le avant de vous connecter.",
	verified: "Adresse vérifiée. Vous pouvez vous connecter.",
	reset: "Mot de passe changé. Connectez-vous avec le nouveau.",
} as const;

export type LoginNotice = keyof typeof NOTICES;

export function LoginPage({ notice }: { notice?: LoginNotice }) {
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

				<OauthGroup />
				<LoginForm />
				<TextLink href="/forgot-password" className="self-center text-muted">
					Mot de passe oublié ?
				</TextLink>
			</div>
		</FlowScreen>
	);
}
