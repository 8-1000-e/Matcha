export interface EventInput {
	title: string;
	location: string | null;
	starts_at: string;
	ends_at: string;
}

export const TITLE_MAX = 120;
export const LOCATION_MAX = 200;
export const MAX_DURATION_HOURS = 12;

export function validateEvent(_body: unknown):
	{ ok: true; value: EventInput } | { ok: false; errors: string[] }
{
	// 1. Refuser ce qui n'est pas un objet -> ["invalid request body"].
	// 2. title : chaine, 1 a TITLE_MAX apres trim.
	// 3. location : absent ou null accepte, sinon chaine <= LOCATION_MAX.
	// 4. starts_at / ends_at : chaines ISO valides (new Date -> pas NaN).
	// 5. starts_at doit etre dans le futur.
	// 6. ends_at doit etre apres starts_at, et la duree ne doit pas
	//    depasser MAX_DURATION_HOURS.
	// 7. Renvoyer les valeurs nettoyees (trim, dates en ISO).
	throw new Error("validateEvent not implemented");
}
