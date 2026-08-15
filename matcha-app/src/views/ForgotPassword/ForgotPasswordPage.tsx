import { ForgotPasswordForm } from "@/components/Form/AuthForms";
import { Footer } from "@/components/Layout/Footer";
import { FlowScreen } from "@/components/Layout/Screen";

export function ForgotPasswordPage() {
	return (
		<FlowScreen
			back="/login"
			title="Mot de passe oublié"
			intro="Indiquez l’adresse de votre compte : vous recevrez un lien pour en choisir un nouveau."
			footer={<Footer />}
		>
			<ForgotPasswordForm />
		</FlowScreen>
	);
}
