export type AuthField =
	| "email"
	| "username"
	| "first_name"
	| "last_name"
	| "birth_date"
	| "password";

export interface AuthError {
	field: AuthField | null;
	message: string;
}

export const GENERIC_ERROR = "Une erreur est survenue, réessayez.";
export const NETWORK_ERROR = "Serveur injoignable, vérifiez votre connexion.";

const REQUIRED = "Ce champ est obligatoire.";

const TRANSLATIONS: Record<string, AuthError> = {
	"email is required": { field: "email", message: REQUIRED },
	"email is too short": { field: "email", message: "Cette adresse est trop courte." },
	"email is too long": { field: "email", message: "Cette adresse dépasse 254 caractères." },
	"email is invalid": { field: "email", message: "Cette adresse e-mail n’est pas valide." },

	"username is required": { field: "username", message: REQUIRED },
	"username is too short": { field: "username", message: "Trois caractères minimum." },
	"username is too long": { field: "username", message: "Trente-deux caractères maximum." },
	"username may only contain letters, digits, dot, dash and underscore": {
		field: "username",
		message: "Lettres, chiffres, point, tiret et tiret bas uniquement.",
	},

	"first name is required": { field: "first_name", message: REQUIRED },
	"first name is empty": { field: "first_name", message: REQUIRED },
	"first name is too long": { field: "first_name", message: "Cinquante caractères maximum." },
	"first name is invalid": {
		field: "first_name",
		message: "Lettres, espace, apostrophe et tiret uniquement.",
	},

	"last name is required": { field: "last_name", message: REQUIRED },
	"last name is empty": { field: "last_name", message: REQUIRED },
	"last name is too long": { field: "last_name", message: "Cinquante caractères maximum." },
	"last name is invalid": {
		field: "last_name",
		message: "Lettres, espace, apostrophe et tiret uniquement.",
	},

	"birth date is required": { field: "birth_date", message: REQUIRED },
	"birth date must use the yyyy-mm-dd format": {
		field: "birth_date",
		message: "Cette date n’est pas valide.",
	},
	"birth date does not exist": { field: "birth_date", message: "Cette date n’existe pas." },
	"you must be at least 18 years old": {
		field: "birth_date",
		message: "Vous devez avoir 18 ans ou plus.",
	},
	"birth date is not plausible": {
		field: "birth_date",
		message: "Cette date n’est pas plausible.",
	},

	"password is required": { field: "password", message: REQUIRED },
	"password is too short": { field: "password", message: "Huit caractères minimum." },
	"password is too long": { field: "password", message: "Ce mot de passe est trop long." },
	"password contains control characters": {
		field: "password",
		message: "Ce mot de passe contient des caractères interdits.",
	},
	"password contains a common english word": {
		field: "password",
		message: "Ce mot de passe est trop courant, choisissez-en un autre.",
	},
	"password must contain a digit": { field: "password", message: "Ajoutez au moins un chiffre." },
	"password must contain a special character": {
		field: "password",
		message: "Ajoutez au moins un caractère spécial.",
	},

	"email or username is already in use": {
		field: null,
		message: "Cet e-mail ou ce nom d’utilisateur est déjà pris.",
	},
	"invalid username or password": {
		field: null,
		message: "Nom d’utilisateur ou mot de passe incorrect.",
	},
	"username and password are required": {
		field: null,
		message: "Renseignez votre nom d’utilisateur et votre mot de passe.",
	},
	unauthorized: { field: null, message: "Votre session a expiré, reconnectez-vous." },
	"request body is too large": { field: null, message: GENERIC_ERROR },
	"invalid request body": { field: null, message: GENERIC_ERROR },
	"invalid json body": { field: null, message: GENERIC_ERROR },
};

export function translateError(raw: string): AuthError {
	return (
		TRANSLATIONS[raw.trim().toLowerCase()] ?? { field: null, message: GENERIC_ERROR }
	);
}
