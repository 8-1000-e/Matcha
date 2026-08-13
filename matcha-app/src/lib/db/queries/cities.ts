import { queryAll } from "../core/client";
import { escapeLike } from "../core/operators";
import { sql } from "../core/sql";

export interface CityRow {
	id: number;
	name: string;
	region: string | null;
	country: string;
	country_code: string;
	latitude: number;
	longitude: number;
	population: number;
}

/** Retire les accents et la casse, comme la colonne search_name a l'insertion. */
export function foldCity(value: string): string {
	return value
		.normalize("NFD")
		.replace(/\p{Diacritic}/gu, "")
		.toLowerCase()
		.trim();
}

/**
 * Le referentiel GeoNames est local, donc la recherche a la frappe ne depend
 * ni du reseau ni d'un quota externe. On classe par population : sur un
 * prefixe court, ce sont les grandes villes qui sont attendues en premier.
 */
export function searchCities(query: string, limit = 8): CityRow[] {
	const folded = foldCity(query);
	if (folded.length < 2) {
		return [];
	}

	return queryAll<CityRow>(sql`
		SELECT id, name, region, country, country_code, latitude, longitude, population
		FROM cities
		WHERE search_name LIKE ${`${escapeLike(folded)}%`} ESCAPE '\\'
		ORDER BY population DESC, name ASC
		LIMIT ${limit}
	`);
}
