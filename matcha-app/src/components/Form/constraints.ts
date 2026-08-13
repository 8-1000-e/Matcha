/**
 * Contraintes de saisie partagées par tous les formulaires.
 *
 * Elles reflètent volontairement les règles appliquées par le back
 * (src/lib/auth/validation.ts et src/lib/auth/passwordPolicy.ts).
 * Ce module ne peut pas importer ces fichiers : ils lisent le disque au
 * chargement et ne sont donc pas embarquables côté client. Toute
 * modification du back doit être répercutée ici, et nulle part ailleurs
 * dans les composants.
 */

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 32;
export const USERNAME_PATTERN = "[A-Za-z0-9._-]+";
export const USERNAME_MESSAGE =
	"Lettres, chiffres, point, tiret et tiret bas uniquement.";

export const NAME_MAX = 50;
export const NAME_PATTERN = "\\p{L}+(?:[ '-]\\p{L}+)*";
export const NAME_MESSAGE = "Lettres, espace, apostrophe et tiret uniquement.";

export const EMAIL_MAX = 254;

export const PASSWORD_MIN = 8;
export const PASSWORD_STRONG = 12;
export const PASSWORD_PATTERN = `(?=.*\\d)(?=.*[^A-Za-z0-9]).{${PASSWORD_MIN},}`;
export const PASSWORD_MESSAGE = "Ajoutez un chiffre et un caractère spécial.";

export const MINIMUM_AGE = 18;
export const MAXIMUM_AGE = 120;

function shiftYears(years: number) {
	const date = new Date();
	date.setUTCHours(0, 0, 0, 0);
	date.setUTCFullYear(date.getUTCFullYear() - years);
	return date.toISOString().slice(0, 10);
}

/** Bornes ISO acceptées par le champ « date de naissance ». */
export function birthDateBounds() {
	return { min: shiftYears(MAXIMUM_AGE), max: shiftYears(MINIMUM_AGE) };
}

export function isOldEnough(birthDate: string) {
	return birthDate.length > 0 && birthDate <= birthDateBounds().max;
}
