import Link from "next/link";
import { OauthGroup, SignupForm } from "@/components/Form/AuthForms";
import { FlowScreen } from "@/components/Layout/Screen";

export function SignupPage() {
	return (
		<FlowScreen
			back="/"
			title="Votre compte"
			intro="Vous compléterez votre profil après la connexion."
			footer={
				<>
					Déjà inscrit ?{" "}
					<Link href="/login" className="font-medium text-matcha underline">
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
