export type AuthField =
	| "email"
	| "username"
	| "first_name"
	| "last_name"
	| "birth_date"
	| "password"
	| "gender"
	| "orientation"
	| "biography"
	| "tags"
	| "city"
	| "photo";

export interface AuthError {
	field: AuthField | null;
	message: string;
}

export const GENERIC_ERROR = "Une erreur est survenue, réessayez.";
export const NETWORK_ERROR = "Serveur injoignable, vérifiez votre connexion.";

const REQUIRED = "Ce champ est obligatoire.";
const EXPIRED = "Votre session a expiré, reconnectez-vous.";
const LINK_DEAD = "Ce lien n’est plus valide, demandez-en un nouveau.";

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

	"gender is invalid": { field: "gender", message: "Choisissez un genre dans la liste." },
	"orientation is invalid": {
		field: "orientation",
		message: "Choisissez une orientation dans la liste.",
	},

	"biography is empty": { field: "biography", message: REQUIRED },
	"biography is too long": {
		field: "biography",
		message: "Cinq cents caractères maximum.",
	},
	"biography is invalid": {
		field: "biography",
		message: "Cette biographie contient des caractères interdits.",
	},

	"tags must be a list of labels": { field: "tags", message: GENERIC_ERROR },
	"at least 3 tags are required": {
		field: "tags",
		message: "Choisissez au moins trois centres d’intérêt.",
	},
	"at most 10 tags are allowed": {
		field: "tags",
		message: "Dix centres d’intérêt maximum.",
	},
	"one or more tags do not exist": {
		field: "tags",
		message: "Un de ces centres d’intérêt n’existe pas.",
	},

	"coordinates are invalid": {
		field: "city",
		message: "Ces coordonnées ne sont pas valides.",
	},
	"coordinates or a city are required": {
		field: "city",
		message: "Partagez votre position ou saisissez votre ville.",
	},
	"city is empty": { field: "city", message: REQUIRED },
	"city is too long": { field: "city", message: "Cent caractères maximum." },
	"city is invalid": { field: "city", message: "Ce nom de ville n’est pas valide." },

	"photo is required": { field: "photo", message: "Choisissez une image." },
	"photo must be a jpeg, png or webp image": {
		field: "photo",
		message: "Formats acceptés : JPEG, PNG et WebP.",
	},
	"photo is too large": { field: "photo", message: "Cette image dépasse 5 Mo." },
	"photo could not be processed": {
		field: "photo",
		message: "Cette image est illisible, essayez-en une autre.",
	},
	"photo limit reached": {
		field: "photo",
		message: "Cinq photos maximum, supprimez-en une d’abord.",
	},
	"photo not found": { field: "photo", message: "Cette photo n’existe plus." },
	"is_profile must be true": { field: "photo", message: GENERIC_ERROR },
	"photo order must be a list of ids": { field: "photo", message: GENERIC_ERROR },
	"photo order contains duplicates": { field: "photo", message: GENERIC_ERROR },
	"photo order does not match your photos": {
		field: "photo",
		message: "L’ordre des photos a changé, rechargez la page.",
	},

	"email is already in use": {
		field: "email",
		message: "Cette adresse est déjà utilisée.",
	},
	"no field to update": { field: null, message: "Aucune modification à enregistrer." },
	"content-type must be multipart/form-data": { field: null, message: GENERIC_ERROR },

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
	"token is required": { field: null, message: LINK_DEAD },
	"invalid or expired token": { field: null, message: LINK_DEAD },
	"token has already been used": {
		field: null,
		message: "Ce lien a déjà été utilisé.",
	},
	"token and password are required": {
		field: "password",
		message: REQUIRED,
	},
	unauthorized: { field: null, message: EXPIRED },
	"refresh token is required": { field: null, message: EXPIRED },
	"invalid session": { field: null, message: EXPIRED },
	"request body is too large": { field: null, message: GENERIC_ERROR },
	"invalid request body": { field: null, message: GENERIC_ERROR },
	"invalid json body": { field: null, message: GENERIC_ERROR },
	"content-type must be application/json": { field: null, message: GENERIC_ERROR },
};

export function translateError(raw: string): AuthError {
	return (
		TRANSLATIONS[raw.trim().toLowerCase()] ?? { field: null, message: GENERIC_ERROR }
	);
}
