import { createHash } from "node:crypto";
import { SORT_KEYS, type DiscoveryFilters, type DiscoverySort } from "@/lib/db";

const INTEGER_RE = /^-?\d+$/;
const CONTROL_RE = /\p{Cc}/u;

const MIN_AGE = 18;
const MAX_AGE = 120;
const MAX_RATING = 5;
const MAX_DISTANCE_KM = 20038;
const MAX_ENTRIES = 500;
const CITY_MAX = 100;
const USERNAME_MAX = 32;

export const PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 40;

export interface DiscoveryQuery {
	filters: DiscoveryFilters;
	sort: readonly DiscoverySort[];
	limit: number;
	sessionId: string | null;
	after: number;
}

export type QueryResult =
	| { ok: true; value: DiscoveryQuery }
	| { ok: false; errors: string[] };

export function validateDiscoveryQuery(params: URLSearchParams): QueryResult
{
	const errors: string[] = [];
	const tagIds = readTagIds(params, errors);
	const sort = readSort(params, errors);
	const ageMin = readInteger(params, "ageMin", MIN_AGE, MAX_AGE, errors);
	const ageMax = readInteger(params, "ageMax", MIN_AGE, MAX_AGE, errors);
	if (ageMin !== undefined && ageMax !== undefined && ageMax < ageMin)
	{
		errors.push(`ageMax (${ageMax}) is lower than ageMin (${ageMin})`);
	}

	const ratingMin = readInteger(params, "ratingMin", 0, MAX_RATING, errors);
	const ratingMax = readInteger(params, "ratingMax", 0, MAX_RATING, errors);
	if (ratingMin !== undefined && ratingMax !== undefined && ratingMax < ratingMin)
	{
		errors.push(`ratingMax (${ratingMax}) is lower than ratingMin (${ratingMin})`);
	}

	const maxDistanceKm = readInteger(params, "maxDistanceKm", 0, MAX_DISTANCE_KM, errors);
	const city = readCity(params, errors);
	const usernameQuery = readUsername(params, errors);
	const tagMode = readTagMode(params, errors);
	const limit = readInteger(params, "limit", 1, MAX_PAGE_SIZE, errors) ?? PAGE_SIZE;
	const after = readInteger(params, "after", 0, MAX_ENTRIES, errors) ?? 0;

	if (errors.length > 0)
	{
		return { ok: false, errors };
	}

	return {
		ok: true,
		value: {
			filters: {
				ageMin,
				ageMax,
				popularityMin: ratingMin,
				popularityMax: ratingMax,
				maxDistanceKm,
				city,
				usernameQuery,
				tagIds,
				tagMode,
			},
			sort,
			limit,
			sessionId: params.get("session"),
			after,
		},
	};
}

export function filtersHash(query: DiscoveryQuery): string
{
	const filters = query.filters;
	const stable = JSON.stringify({
		ageMin: filters.ageMin ?? null,
		ageMax: filters.ageMax ?? null,
		popularityMin: filters.popularityMin ?? null,
		popularityMax: filters.popularityMax ?? null,
		maxDistanceKm: filters.maxDistanceKm ?? null,
		city: filters.city ?? null,
		usernameQuery: filters.usernameQuery ?? null,
		tagIds: [...(filters.tagIds ?? [])].sort((a, b) => a - b),
		tagMode: filters.tagMode ?? "any",
		sort: query.sort.map((one) => `${one.key}:${one.direction ?? "asc"}`),
	});

	return createHash("sha256").update(stable).digest("hex");
}

function readCity(params: URLSearchParams, errors: string[]): string | undefined
{
	const raw = params.get("city");
	if (raw === null)
	{
		return undefined;
	}

	const city = raw.trim();
	if (city.length === 0 || city.length > CITY_MAX || CONTROL_RE.test(city))
	{
		errors.push("city is invalid");
		return undefined;
	}

	return city;
}

function readUsername(
	params: URLSearchParams,
	errors: string[],
): string | undefined
{
	const raw = params.get("username");
	if (raw === null)
	{
		return undefined;
	}

	const username = raw.trim();
	if (username.length === 0 || username.length > USERNAME_MAX
		|| CONTROL_RE.test(username))
	{
		errors.push("username is invalid");
		return undefined;
	}

	return username;
}

function readTagMode(
	params: URLSearchParams,
	errors: string[],
): "any" | "all" | undefined
{
	const raw = params.get("tagMode");
	if (raw === null)
	{
		return undefined;
	}
	if (raw !== "any" && raw !== "all")
	{
		errors.push(`invalid tagMode: ${raw}`);
		return undefined;
	}
	return raw;
}

function readInteger(
	params: URLSearchParams,
	name: string,
	min: number,
	max: number,
	errors: string[],
): number | undefined
{
	const raw = params.get(name);
	if (raw === null)
	{return undefined;}

	if (!INTEGER_RE.test(raw.trim()))
	{
		errors.push(`${name} must be an integer`);
		return undefined;
	}

	const value = Number(raw);
	if (value < min || value > max)
	{
		errors.push(`${name} must be between ${min} and ${max}`);
		return undefined;
	}
	return value;
}

function readTagIds(params: URLSearchParams, errors: string[]): number[] | undefined
{
	const ids: number[] = [];
	const raw = params.get("tags")?.split(",");
	if (!raw?.length)
	{return undefined;}
	for (const tag of raw)
	{
		if (!INTEGER_RE.test(tag.trim()) || Number(tag) <= 0)
		{
			errors.push(`tags contain an invalid id: ${tag}`);
			return undefined;
		}
		if (!ids.includes(Number(tag)))
		{ids.push(Number(tag));}
	}
	return ids;
}

function readSort(params: URLSearchParams, errors: string[]): DiscoverySort[]
{
	const sort = params.get("sort");
	if (sort === null)
	{
		return [];
	}

	const sortType = SORT_KEYS.find((key) => key === sort);
	if (sortType === undefined)
	{
		errors.push(`invalid sort key: ${sort}`);
		return [];
	}

	const direction = params.get("direction");
	if (direction !== null && direction !== "asc" && direction !== "desc")
	{
		errors.push(`invalid sort direction: ${direction}`);
		return [];
	}

	return [{ key: sortType, direction: direction ?? "asc" }];
}

