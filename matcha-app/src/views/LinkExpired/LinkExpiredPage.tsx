import { ResendVerificationForm } from "@/components/Form/AuthForms";
import { ActionLink } from "@/components/Form/Button";
import { FlowScreen } from "@/components/Layout/Screen";

export type ExpiredLinkKind = "verification" | "reset";

const INTRO = {
	verification:
		"Les liens de vérification sont valables quinze minutes et ne servent qu’une fois. Demandez-en un nouveau ci-dessous.",
	reset:
		"Les liens de réinitialisation sont valables quinze minutes et ne servent qu’une fois. Demandez-en un nouveau pour choisir votre mot de passe.",
} as const;

const GENERIC
	= "Les liens envoyés par e-mail sont valables quinze minutes et ne servent qu’une fois. Choisissez ce que vous voulez recevoir.";

export function LinkExpiredPage({ kind }: { kind?: ExpiredLinkKind }) {
	return (
		<FlowScreen
			back="/login"
			title="Ce lien a expiré"
			intro={kind ? INTRO[kind] : GENERIC}
			footer={''}
		>
			<div className="flex flex-col gap-8">
				{kind !== "reset" ? <ResendVerificationForm /> : null}

				{kind !== "verification" ? (
					<ActionLink href="/forgot-password" tone="secondary">
						Réinitialiser mon mot de passe
					</ActionLink>
				) : null}
			</div>
		</FlowScreen>
	);
}
