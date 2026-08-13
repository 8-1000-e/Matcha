import { foldCity, searchCities } from "@/lib/db";

const PHOTON_URL = process.env.PHOTON_URL ?? "https://photon.komoot.io";
const BAN_URL = process.env.BAN_URL ?? "https://api-adresse.data.gouv.fr";
const NOMINATIM_URL = process.env.NOMINATIM_URL ?? "https://nominatim.openstreetmap.org";
const USER_AGENT = "Brewmance";
const TIMEOUT_MS = 3000;

const PHOTON_CITY = ["city", "town", "village", "county"];
const PHOTON_AREA = ["district", "locality", "suburb", "neighbourhood", "quarter"];
const BAN_CITY = ["city"];
const BAN_AREA = ["district"];
const NOMINATIM_CITY = ["city", "town", "village", "municipality", "county"];
const NOMINATIM_AREA = ["neighbourhood", "suburb", "quarter", "city_district", "borough"];

export interface Place {
	city: string | null;
	neighborhood: string | null;
}

export interface Point {
	latitude: number;
	longitude: number;
}

interface Provider {
	reverse: (point: Point) => Promise<Place>;
	forward: (query: string) => Promise<(Place & Point) | null>;
}

const EMPTY: Place = { city: null, neighborhood: null };

async function ask(url: string): Promise<unknown>
{
	try
	{
		const response = await fetch(url, {
			headers: { "user-agent": USER_AGENT, accept: "application/json" },
			signal: AbortSignal.timeout(TIMEOUT_MS),
		});
		if (!response.ok)
		{
			return null;
		}
		return await response.json();
	}
	catch
	{
		return null;
	}
}

function pick(source: unknown, keys: readonly string[]): string | null
{
	if (typeof source !== "object" || source === null)
	{
		return null;
	}
	const record = source as Record<string, unknown>;
	for (const key of keys)
	{
		const value = record[key];
		if (typeof value === "string" && value.trim().length > 0)
		{
			return value.trim();
		}
	}
	return null;
}

function readNumber(value: unknown): number | null
{
	const parsed = typeof value === "string" ? Number(value) : value;
	return typeof parsed === "number" && Number.isFinite(parsed) ? parsed : null;
}

function firstFeature(payload: unknown): {
	properties: unknown;
	coordinates: unknown;
} | null
{
	if (typeof payload !== "object" || payload === null)
	{
		return null;
	}
	const features = (payload as { features?: unknown }).features;
	if (!Array.isArray(features) || features.length === 0)
	{
		return null;
	}
	const feature = features[0] as { properties?: unknown; geometry?: unknown };
	const geometry = feature.geometry as { coordinates?: unknown } | undefined;
	return { properties: feature.properties, coordinates: geometry?.coordinates };
}

function geoJsonPlace(
	payload: unknown,
	cityKeys: readonly string[],
	areaKeys: readonly string[],
): Place
{
	const feature = firstFeature(payload);
	if (!feature)
	{
		return EMPTY;
	}
	return {
		city: pick(feature.properties, cityKeys),
		neighborhood: pick(feature.properties, areaKeys),
	};
}

function geoJsonPoint(
	payload: unknown,
	cityKeys: readonly string[],
	areaKeys: readonly string[],
): (Place & Point) | null
{
	const feature = firstFeature(payload);
	if (!feature || !Array.isArray(feature.coordinates))
	{
		return null;
	}

	const longitude = readNumber(feature.coordinates[0]);
	const latitude = readNumber(feature.coordinates[1]);
	if (latitude === null || longitude === null)
	{
		return null;
	}

	return {
		latitude,
		longitude,
		city: pick(feature.properties, cityKeys),
		neighborhood: pick(feature.properties, areaKeys),
	};
}

const photon: Provider = {
	reverse: async (point) => geoJsonPlace(
		await ask(`${PHOTON_URL}/reverse?lat=${point.latitude}&lon=${point.longitude}`),
		PHOTON_CITY,
		PHOTON_AREA,
	),
	forward: async (query) => geoJsonPoint(
		await ask(`${PHOTON_URL}/api?limit=1&q=${encodeURIComponent(query)}`),
		PHOTON_CITY,
		PHOTON_AREA,
	),
};

const ban: Provider = {
	reverse: async (point) => geoJsonPlace(
		await ask(`${BAN_URL}/reverse/?lat=${point.latitude}&lon=${point.longitude}`),
		BAN_CITY,
		BAN_AREA,
	),
	forward: async (query) => geoJsonPoint(
		await ask(`${BAN_URL}/search/?limit=1&q=${encodeURIComponent(query)}`),
		BAN_CITY,
		BAN_AREA,
	),
};

const nominatim: Provider = {
	reverse: async (point) =>
	{
		const payload = await ask(
			`${NOMINATIM_URL}/reverse?format=jsonv2&addressdetails=1&zoom=16`
			+ `&lat=${point.latitude}&lon=${point.longitude}`,
		);
		if (typeof payload !== "object" || payload === null)
		{
			return EMPTY;
		}
		const address = (payload as { address?: unknown }).address;
		return {
			city: pick(address, NOMINATIM_CITY),
			neighborhood: pick(address, NOMINATIM_AREA),
		};
	},
	forward: async (query) =>
	{
		const payload = await ask(
			`${NOMINATIM_URL}/search?format=jsonv2&addressdetails=1&limit=1`
			+ `&q=${encodeURIComponent(query)}`,
		);
		if (!Array.isArray(payload) || payload.length === 0)
		{
			return null;
		}

		const first = payload[0] as Record<string, unknown>;
		const latitude = readNumber(first.lat);
		const longitude = readNumber(first.lon);
		if (latitude === null || longitude === null)
		{
			return null;
		}

		return {
			latitude,
			longitude,
			city: pick(first.address, NOMINATIM_CITY),
			neighborhood: pick(first.address, NOMINATIM_AREA),
		};
	},
};

const PROVIDERS: readonly Provider[] = [photon, ban, nominatim];

function fold(value: string): string
{
	return value
		.normalize("NFD")
		.replace(/\p{Diacritic}/gu, "")
		.toLowerCase()
		.replace(/[^a-z0-9]/g, "");
}

function answers(query: string, city: string | null): boolean
{
	if (city === null)
	{
		return false;
	}
	const asked = fold(query);
	const given = fold(city);
	return asked.length > 0 && given.length > 0
		&& (asked.includes(given) || given.includes(asked));
}

export async function reverseGeocode(point: Point): Promise<Place>
{
	const place: Place = { ...EMPTY };

	for (const provider of PROVIDERS)
	{
		const found = await provider.reverse(point);
		place.city ??= found.city;
		place.neighborhood ??= found.neighborhood;
		if (place.city !== null && place.neighborhood !== null)
		{
			break;
		}
	}

	return place;
}

export async function forwardGeocode(
	query: string,
): Promise<(Place & Point) | null>
{
	// Le referentiel local repond en premier : une ville saisie a la main a
	// ainsi toujours ses coordonnees, meme si les geocodeurs sont injoignables.
	// Sans coordonnees l'utilisateur sortirait du tri par proximite.
	const exact = searchCities(query, 1).find(
		(row) => foldCity(row.name) === foldCity(query),
	);
	if (exact !== undefined)
	{
		return {
			latitude: exact.latitude,
			longitude: exact.longitude,
			city: exact.name,
			neighborhood: null,
		};
	}

	for (const provider of PROVIDERS)
	{
		const found = await provider.forward(query);
		if (found !== null && answers(query, found.city))
		{
			return found;
		}
	}

	return null;
}

export interface Suggestion extends Point {
	city: string;
	neighborhood: string | null;
	region: string | null;
	country: string | null;
}

const PHOTON_REGION = ["state", "county"];
const PHOTON_COUNTRY = ["country"];
const SUGGESTION_LIMIT = 6;

/**
 * Suggestions pour la saisie manuelle. Les villes viennent du referentiel
 * GeoNames charge en base : 235 000 entrees, donc pas de requete reseau ni de
 * quota externe sur une recherche a la frappe. Photon ne sert plus qu'a
 * completer avec les quartiers, que GeoNames ne couvre pas.
 */
export async function searchPlaces(query: string): Promise<Suggestion[]>
{
	const trimmed = query.trim();
	if (trimmed.length < 2)
	{
		return [];
	}

	const local: Suggestion[] = searchCities(trimmed, SUGGESTION_LIMIT).map((row) => ({
		latitude: row.latitude,
		longitude: row.longitude,
		city: row.name,
		neighborhood: null,
		region: row.region,
		country: row.country,
	}));

	const remote = await searchPhoton(trimmed);
	const seen = new Set(local.map((entry) => `${fold(entry.city)}|`));
	const merged = [...local];

	for (const entry of remote)
	{
		// Un resultat Photon n'a d'interet que s'il descend sous la ville : les
		// villes seules, on les a deja, et en plus fiable.
		if (entry.neighborhood === null)
		{
			continue;
		}
		const key = `${fold(entry.city)}|${fold(entry.neighborhood)}`;
		if (seen.has(key))
		{
			continue;
		}
		seen.add(key);
		merged.push(entry);
	}

	return merged.slice(0, SUGGESTION_LIMIT);
}

async function searchPhoton(trimmed: string): Promise<Suggestion[]>
{
	const payload = await ask(
		`${PHOTON_URL}/api?limit=${SUGGESTION_LIMIT}&q=${encodeURIComponent(trimmed)}`,
	);
	if (typeof payload !== "object" || payload === null)
	{
		return [];
	}

	const features = (payload as { features?: unknown }).features;
	if (!Array.isArray(features))
	{
		return [];
	}

	const seen = new Set<string>();
	const results: Suggestion[] = [];

	for (const entry of features)
	{
		const feature = entry as { properties?: unknown; geometry?: unknown };
		const geometry = feature.geometry as { coordinates?: unknown } | undefined;
		if (!Array.isArray(geometry?.coordinates))
		{
			continue;
		}

		const longitude = readNumber(geometry.coordinates[0]);
		const latitude = readNumber(geometry.coordinates[1]);
		const city = pick(feature.properties, PHOTON_CITY)
			?? pick(feature.properties, ["name"]);
		if (latitude === null || longitude === null || city === null)
		{
			continue;
		}

		const neighborhood = pick(feature.properties, PHOTON_AREA);
		const key = `${fold(city)}|${fold(neighborhood ?? "")}`;
		if (seen.has(key))
		{
			continue;
		}
		seen.add(key);

		results.push({
			latitude,
			longitude,
			city,
			neighborhood,
			region: pick(feature.properties, PHOTON_REGION),
			country: pick(feature.properties, PHOTON_COUNTRY),
		});
	}

	return results;
}
