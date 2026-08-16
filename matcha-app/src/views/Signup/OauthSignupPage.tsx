import Link from "next/link";
import { OauthSignupForm, type OauthDraft } from "@/components/Form/AuthForms";
import { FlowScreen } from "@/components/Layout/Screen";

export function OauthSignupPage({ draft }: { draft: OauthDraft }) {
	return (
		<FlowScreen
			back="/signup"
			title="Terminer l’inscription"
			intro="Votre compte est presque prêt. Il ne manque que deux informations que votre fournisseur ne transmet pas."
			footer={
				<>
					Vous préférez un compte classique ?{" "}
					<Link href="/signup" className="inline-block py-2 font-medium text-matcha underline decoration-matcha/40 underline-offset-4 transition-colors duration-200 ease-out hover:decoration-matcha">
						S’inscrire par e-mail
					</Link>
				</>
			}
		>
			<OauthSignupForm draft={draft} />
		</FlowScreen>
	);
}
