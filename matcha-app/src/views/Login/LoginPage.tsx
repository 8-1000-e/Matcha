import Link from "next/link";
import { LoginForm, OauthGroup } from "@/components/Form/AuthForms";
import { FlowScreen } from "@/components/Layout/Screen";

export function LoginPage() {
	return (
		<FlowScreen
			back="/"
			title="Se connecter"
			footer={
				<span className="block text-center">
					Pas de compte ?{" "}
					<Link href="/signup" className="font-medium text-matcha underline">
						Créer un compte
					</Link>
				</span>
			}
		>
			<div className="flex flex-col gap-6">
				<OauthGroup />
				<LoginForm />
				<Link
					href="/forgot-password"
					className="text-center text-sm text-muted underline"
				>
					Mot de passe oublié ?
				</Link>
			</div>
		</FlowScreen>
	);
}
