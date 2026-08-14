import Link from "next/link";
import { ResendVerificationForm } from "@/components/Form/AuthForms";
import { PrivateScreen } from "@/components/Layout/Screen";

export function VerifyEmailPage({ firstName }: { firstName: string }) {
	return (
		<PrivateScreen
			verified={false}
			title="Vérifiez votre adresse"
			intro={`${firstName}, votre compte existe mais son adresse e-mail n’est pas encore confirmée. Ouvrez le lien reçu par mail pour la valider.`}
			footer={
				<span className="block text-center">
					Une fois le lien ouvert,{" "}
					<Link href="/me" className="inline-block py-2 font-medium text-matcha underline decoration-matcha/40 underline-offset-4 transition-colors duration-200 ease-out hover:decoration-matcha">
						revenez ici
					</Link>
					.
				</span>
			}
		>
			<ResendVerificationForm />
		</PrivateScreen>
	);
}
