import { ResetPasswordForm } from "@/components/Form/AuthForms";
import { FlowScreen } from "@/components/Layout/Screen";

export function ResetPasswordPage({ token }: { token: string }) {
	return (
		<FlowScreen
			back="/login"
			title="Nouveau mot de passe"
			intro="Choisissez un nouveau mot de passe. Vos autres sessions seront déconnectées."
			footer={null}
		>
			<ResetPasswordForm token={token} />
		</FlowScreen>
	);
}
