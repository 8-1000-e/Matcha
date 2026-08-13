import Link from "next/link";
import { OauthGroup, SignupForm } from "@/components/Form/AuthForms";
import { FlowScreen } from "@/components/Layout/Screen";

export function SignupPage() {
	return (
		<FlowScreen
			back="/"
			title="Votre compte"
			intro="Un lien de vérification vous sera envoyé par e-mail. Vous compléterez votre profil après la connexion."
			footer={
				<>
					Déjà inscrit ?{" "}
					<Link href="/login" className="inline-block py-2 font-medium text-matcha underline decoration-matcha/40 underline-offset-4 transition-colors duration-200 ease-out hover:decoration-matcha">
						Se connecter
					</Link>
				</>
			}
		>
			<div className="flex flex-col gap-6">
				<OauthGroup />
				<SignupForm />
			</div>
		</FlowScreen>
	);
}
