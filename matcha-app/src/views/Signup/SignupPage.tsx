import Link from "next/link";
import { OauthGroup, StepForm } from "@/components/Form/AuthForms";
import { PasswordField } from "@/components/Form/PasswordField";
import { TextField } from "@/components/Form/TextField";
import { FlowScreen } from "@/components/Layout/Screen";

export function SignupPage() {
	return (
		<FlowScreen
			back="/"
			title="Votre compte"
			intro="Un e-mail de vérification vous sera envoyé pour activer le compte."
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

				<StepForm next="/signup/profile" label="Continuer">
					<div className="grid grid-cols-2 gap-3">
						<TextField id="firstName" label="Prénom" autoComplete="given-name" />
						<TextField id="lastName" label="Nom" autoComplete="family-name" />
					</div>
					<TextField
						id="username"
						label="Nom d’utilisateur"
						autoComplete="username"
						minLength={3}
					/>
					<TextField
						id="email"
						label="Adresse e-mail"
						type="email"
						autoComplete="email"
					/>
					<PasswordField />
				</StepForm>
			</div>
		</FlowScreen>
	);
}
