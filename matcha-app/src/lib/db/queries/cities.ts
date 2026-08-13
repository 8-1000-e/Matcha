import { queryAll } from "../core/client";
import { empty, sql } from "../core/sql";

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
export function foldCity(value: string): string {
	return value
		.normalize("NFD")
		.replace(/\p{Diacritic}/gu, "")
		.toLowerCase()
		.trim();
}

const MAX_CODE_POINT = 0x10ffff;
const FIRST_SURROGATE = 0xd800;
const AFTER_SURROGATES = 0xe000;
function prefixUpperBound(prefix: string): string | undefined {
	const points = [...prefix];
	for (let index = points.length - 1; index >= 0; index -= 1) {
		const next = (points[index].codePointAt(0) ?? 0) + 1;
		if (next <= MAX_CODE_POINT) {
			const bumped = next === FIRST_SURROGATE ? AFTER_SURROGATES : next;
			return points.slice(0, index).join("") + String.fromCodePoint(bumped);
		}
	}
	return undefined;
}
export function searchCities(query: string, limit = 8): CityRow[] {
	const folded = foldCity(query);
	if (folded.length < 2) {
		return [];
	}
	const upperBound = prefixUpperBound(folded);

	return queryAll<CityRow>(sql`
		SELECT id, name, region, country, country_code, latitude, longitude, population
		FROM cities
		WHERE search_name >= ${folded}
			${upperBound === undefined ? empty : sql`AND search_name < ${upperBound}`}
		ORDER BY population DESC, name ASC
		LIMIT ${limit}
	`);
}