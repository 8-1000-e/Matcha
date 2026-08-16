export interface OauthFeedback {
	text: string;
	tone: "success" | "error";
}

const MESSAGES: Record<string, OauthFeedback> = {
	state: {
		text: "La connexion a expiré ou a été interrompue. Réessayez.",
		tone: "error",
	},
	exchange: {
		text: "Le fournisseur n’a pas confirmé la connexion. Réessayez.",
		tone: "error",
	},
	profile: {
		text: "Le fournisseur n’a pas renvoyé votre profil. Réessayez.",
		tone: "error",
	},
	email: {
		text: "Ce compte n’a pas d’adresse e-mail vérifiée : inscrivez-vous par e-mail.",
		tone: "error",
	},
	session: { text: "Connectez-vous avant de relier un compte.", tone: "error" },
	already_linked: {
		text: "Ce compte est déjà relié à un autre profil Brewmance, ou vous en avez déjà relié un chez ce fournisseur.",
		tone: "error",
	},
	linked: { text: "Compte relié.", tone: "success" },
};

export function oauthMessage(value: string | undefined): OauthFeedback | undefined {
	return value === undefined ? undefined : MESSAGES[value];
}
