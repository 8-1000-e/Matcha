import { coarseOrigin } from "@/lib/discovery/blur";
import { queryAll, queryScalar } from "../core/client";
import { DatabaseError } from "../core/errors";
import {
	boundedInteger,
	direction,
	finiteNumber,
	pickKey,
} from "../core/identifiers";
import { startsWith } from "../core/operators";
import { every, join, raw, sql, when, type SqlFragment } from "../core/sql";
import type { Flag } from "../core/values";
import { ageYears, onlineNow } from "../schema/views";
import { GENDERS, type Gender, type UserRow } from "../types";

const SORT_COLUMNS = {
	distance: "distance_km",
	age: "age",
	popularity: "review_average",
	common_tags: "common_tags",
	last_seen: "last_seen_at",
	created: "created_at",
	online: onlineNow("candidate.last_seen_at"),
} as const;

export const SORT_KEYS = Object.keys(SORT_COLUMNS) as (keyof typeof SORT_COLUMNS)[];

export type DiscoverySortKey = keyof typeof SORT_COLUMNS;

export interface DiscoverySort {
	key: DiscoverySortKey;
	direction?: "asc" | "desc";
}

export interface DiscoveryFilters {
	ageMin?: number;
	ageMax?: number;
	popularityMin?: number;
	popularityMax?: number;
	maxDistanceKm?: number;
	city?: string;
	genders?: readonly Gender[];
	tagIds?: readonly number[];
	tagMode?: "any" | "all";
	onlineOnly?: boolean;
	usernameQuery?: string;
}

export interface DiscoveryOptions {
	filters?: DiscoveryFilters;
	sort?: readonly DiscoverySort[];
	limit?: number;
	offset?: number;
	includeLiked?: boolean;
	respectOrientation?: boolean;
	excludeIds?: readonly string[];
}

export interface DiscoveryRow
	extends Omit<UserRow, "email" | "password_hash"> {
	age: number;
	distance_km: number | null;
	common_tags: number;
	review_average: number;
	review_count: number;
	photo_count: number;
	profile_photo_path: string | null;
	profile_photo_id: string | null;
	photo_ids: string | null;
	tags: string | null;
	viewer_liked?: number;
}

const PUBLIC_COLUMNS = raw(
	[
		"id",
		"username",
		"first_name",
		"last_name",
		"birth_date",
		"gender",
		"orientation",
		"biography",
		"is_verified",
		"profile_completed",
		"latitude",
		"longitude",
		"city",
		"neighborhood",
		"location_consent",
		"last_seen_at",
		"created_at",
	]
		.map((column) => `candidate.${column}`)
		.join(", "),
);

const DEFAULT_SORT: readonly DiscoverySort[] = [
	{ key: "distance", direction: "asc" },
	{ key: "common_tags", direction: "desc" },
	{ key: "popularity", direction: "desc" },
];

function yearsAgo(years: number, label: string): string {
	return `-${boundedInteger(years, 18, 120, label)} years`;
}

function orientationClause(viewer: UserRow): SqlFragment {
	return every([
		sql`CASE ${viewer.orientation}
			WHEN 'hetero' THEN CASE ${viewer.gender}
				WHEN 'man' THEN candidate.gender = 'woman'
				WHEN 'woman' THEN candidate.gender = 'man'
				ELSE candidate.gender IS NOT ${viewer.gender} END
			WHEN 'homo' THEN candidate.gender IS ${viewer.gender}
			WHEN 'bi' THEN candidate.gender IN ('woman', 'man')
			WHEN 'pan' THEN candidate.gender <> 'other'
			ELSE 1 END`,
		sql`CASE candidate.orientation
			WHEN 'hetero' THEN CASE candidate.gender
				WHEN 'man' THEN ${viewer.gender} = 'woman'
				WHEN 'woman' THEN ${viewer.gender} = 'man'
				ELSE ${viewer.gender} IS NOT candidate.gender END
			WHEN 'homo' THEN ${viewer.gender} IS candidate.gender
			WHEN 'bi' THEN ${viewer.gender} IN ('woman', 'man')
			WHEN 'pan' THEN ${viewer.gender} <> 'other'
			ELSE 1 END`,
	]);
}

function filterClauses(
	viewer: UserRow,
	filters: DiscoveryFilters,
): SqlFragment[] {
	const clauses: SqlFragment[] = [];
	if (filters.ageMin !== undefined) {
		clauses.push(
			sql`candidate.birth_date <= date('now', ${yearsAgo(
				filters.ageMin,
				"ageMin",
			)})`,
		);
	}
	if (filters.ageMax !== undefined) {
		clauses.push(
			sql`candidate.birth_date > date('now', ${yearsAgo(
				filters.ageMax + 1,
				"ageMax",
			)})`,
		);
	}
	if (filters.popularityMin !== undefined) {
		clauses.push(
			sql`popularity.review_average >= ${finiteNumber(
				filters.popularityMin,
				0,
				5,
				"popularityMin",
			)}`,
		);
	}
	if (filters.popularityMax !== undefined) {
		clauses.push(
			sql`popularity.review_average <= ${finiteNumber(
				filters.popularityMax,
				0,
				5,
				"popularityMax",
			)}`,
		);
	}
	if (filters.maxDistanceKm !== undefined) {
		clauses.push(
			sql`distance_km(
				${coarseOrigin(viewer.latitude)}, ${coarseOrigin(viewer.longitude)},
				candidate.latitude, candidate.longitude
			) <= ${finiteNumber(filters.maxDistanceKm, 0, 20038, "maxDistanceKm")}`,
		);
	}
	if (filters.city !== undefined) {
		clauses.push(sql`candidate.city = ${filters.city}`);
	}
	if (filters.genders !== undefined && filters.genders.length > 0) {
		clauses.push(
			sql`candidate.gender IN (${filters.genders.map((gender) =>
				pickKey(gender, GENDERS, "gender"),
			)})`,
		);
	}
	if (filters.onlineOnly === true) {
		clauses.push(raw(onlineNow("candidate.last_seen_at")));
	}
	if (filters.usernameQuery !== undefined) {
		const needle = filters.usernameQuery;
		clauses.push(sql`(
			candidate.username ${startsWith(needle)}
			OR candidate.first_name ${startsWith(needle)}
			OR candidate.last_name ${startsWith(needle)}
		)`);
	}
	if (filters.tagIds !== undefined && filters.tagIds.length > 0) {
		const tagIds = filters.tagIds.map((tagId) =>
			boundedInteger(tagId, 1, Number.MAX_SAFE_INTEGER, "tagId"),
		);
		const matched = sql`(
			SELECT COUNT(*) FROM user_tags
			WHERE user_tags.user_id = candidate.id
				AND user_tags.tag_id IN (${tagIds})
		)`;
		clauses.push(
			filters.tagMode === "all"
				? sql`${matched} = ${tagIds.length}`
				: sql`${matched} > 0`,
		);
	}
	return clauses;
}

function ordering(sorts: readonly DiscoverySort[]): SqlFragment {
	if (sorts.length === 0) {
		return raw("ORDER BY review_average DESC, candidate.id");
	}
	const parts = sorts.map((sort) => {
		const key = pickKey(sort.key, SORT_KEYS, "sort key");
		const column = raw(SORT_COLUMNS[key]);
		const way = direction(sort.direction ?? "asc");
		if (key === "distance") {
			return sql`${column} IS NULL, ${column} ${way}`;
		}
		return sql`${column} ${way}`;
	});
	return sql`ORDER BY ${join(parts)}, candidate.id`;
}

function discoveryConditions(
	viewer: UserRow,
	options: DiscoveryOptions,
): SqlFragment {
	const filters = options.filters ?? {};
	return every([
		sql`candidate.id <> ${viewer.id}`,
		raw("candidate.profile_completed = 1"),
		raw("candidate.is_verified = 1"),
		raw("candidate.deleted_at IS NULL"),
		sql`NOT EXISTS (
			SELECT 1 FROM blocks
			WHERE (blocks.blocker_id = ${viewer.id} AND blocks.blocked_id = candidate.id)
				OR (blocks.blocker_id = candidate.id AND blocks.blocked_id = ${viewer.id})
		)`,
		when(
			options.respectOrientation !== false,
			() => orientationClause(viewer),
		),
		when(
			options.includeLiked !== true,
			() =>
				sql`NOT EXISTS (
					SELECT 1 FROM likes
					WHERE likes.liker_id = ${viewer.id} AND likes.liked_id = candidate.id
				)`,
		),
		when(
			options.excludeIds !== undefined && options.excludeIds.length > 0,
			() => sql`candidate.id NOT IN (${[...(options.excludeIds ?? [])]})`,
		),
		...filterClauses(viewer, filters),
	]);
}

function projection(viewer: UserRow): SqlFragment {
	return sql`${PUBLIC_COLUMNS},
		${raw(onlineNow("candidate.last_seen_at"))} AS is_online,
		${raw(ageYears("candidate.birth_date"))} AS age,
		distance_km(
			${coarseOrigin(viewer.latitude)}, ${coarseOrigin(viewer.longitude)},
			candidate.latitude, candidate.longitude
		) AS distance_km,
		(
			SELECT COUNT(*) FROM user_tags AS theirs
			JOIN user_tags AS mine ON mine.tag_id = theirs.tag_id
			WHERE theirs.user_id = candidate.id AND mine.user_id = ${viewer.id}
		) AS common_tags,
		popularity.review_average AS review_average,
		popularity.review_count AS review_count,
		(SELECT COUNT(*) FROM photos WHERE photos.user_id = candidate.id)
			AS photo_count,
		(
			SELECT path FROM photos
			WHERE photos.user_id = candidate.id AND photos.is_profile = 1
		) AS profile_photo_path,
		(
			SELECT id FROM photos
			WHERE photos.user_id = candidate.id AND photos.is_profile = 1
		) AS profile_photo_id,
		(
			SELECT GROUP_CONCAT(ordered.id, ',') FROM (
				SELECT id FROM photos
				WHERE photos.user_id = candidate.id
				ORDER BY is_profile DESC, created_at, id
			) AS ordered
		) AS photo_ids,
		(
			SELECT GROUP_CONCAT(tags.label, ',') FROM user_tags
			JOIN tags ON tags.id = user_tags.tag_id
			WHERE user_tags.user_id = candidate.id
		) AS tags`;
}

export function findCandidates(
	viewer: UserRow,
	options: DiscoveryOptions = {},
): DiscoveryRow[] {
	if (viewer.profile_completed !== 1) {
		throw new DatabaseError("profile_incomplete");
	}
	const limit = boundedInteger(options.limit ?? 50, 1, 500, "limit");
	const offset = boundedInteger(options.offset ?? 0, 0, 100000, "offset");
	const conditions = discoveryConditions(viewer, options);
	return queryAll<DiscoveryRow>(
		sql`SELECT ${projection(viewer)}
			FROM users AS candidate
			JOIN user_popularity AS popularity ON popularity.user_id = candidate.id
			WHERE ${conditions}
			${ordering(options.sort?.length ? options.sort : DEFAULT_SORT)}
			LIMIT ${limit} OFFSET ${offset}`,
	);
}
export interface MapBounds {
	south: number;
	north: number;
	west: number;
	east: number;
}

export interface MapCandidateRow {
	id: string;
	first_name: string;
	age: number;
	city: string | null;
	latitude: number | null;
	longitude: number | null;
	distance_km: number | null;
	is_online: Flag;
	profile_photo_id: string | null;
}

export function findMapCandidates(
	viewer: UserRow,
	bounds: MapBounds,
	limit: number,
	options: DiscoveryOptions = {},
): MapCandidateRow[] {
	if (viewer.profile_completed !== 1) {
		throw new DatabaseError("profile_incomplete");
	}

	const south = finiteNumber(bounds.south, -90, 90, "south");
	const north = finiteNumber(bounds.north, -90, 90, "north");
	const west = finiteNumber(bounds.west, -180, 180, "west");
	const east = finiteNumber(bounds.east, -180, 180, "east");
	const rows = boundedInteger(limit, 1, 1000, "limit");

	const inside = west <= east
		? sql`candidate.longitude BETWEEN ${west} AND ${east}`
		: sql`(candidate.longitude >= ${west} OR candidate.longitude <= ${east})`;

	return queryAll<MapCandidateRow>(
		sql`SELECT
				candidate.id,
				candidate.first_name,
				${raw(ageYears("candidate.birth_date"))} AS age,
				candidate.city,
				candidate.latitude,
				candidate.longitude,
				distance_km(
					${coarseOrigin(viewer.latitude)}, ${coarseOrigin(viewer.longitude)},
					candidate.latitude, candidate.longitude
				) AS distance_km,
				${raw(onlineNow("candidate.last_seen_at"))} AS is_online,
				(
					SELECT id FROM photos
					WHERE photos.user_id = candidate.id AND photos.is_profile = 1
				) AS profile_photo_id
			FROM users AS candidate
			JOIN user_popularity AS popularity ON popularity.user_id = candidate.id
			WHERE ${discoveryConditions(viewer, options)}
				AND candidate.latitude IS NOT NULL
				AND candidate.longitude IS NOT NULL
				AND candidate.latitude BETWEEN ${south} AND ${north}
				AND ${inside}
			ORDER BY distance_km IS NULL, distance_km
			LIMIT ${rows}`,
	);
}

export function findCandidatesByIds(
	viewer: UserRow,
	ids: readonly string[],
	options: DiscoveryOptions = {},
): DiscoveryRow[] {
	if (ids.length === 0) {
		return [];
	}
	return queryAll<DiscoveryRow>(
		sql`SELECT ${projection(viewer)},
			EXISTS (
				SELECT 1 FROM likes
				WHERE likes.liker_id = ${viewer.id} AND likes.liked_id = candidate.id
			) AS viewer_liked
			FROM users AS candidate
			JOIN user_popularity AS popularity ON popularity.user_id = candidate.id
			WHERE candidate.id IN (${[...ids]})
				AND ${discoveryConditions(viewer, options)}`,
	);
}

export function countCandidates(
	viewer: UserRow,
	options: DiscoveryOptions = {},
): number {
	if (viewer.profile_completed !== 1) {
		throw new DatabaseError("profile_incomplete");
	}
	return (
		queryScalar<number>(
			sql`SELECT COUNT(*) FROM users AS candidate
				JOIN user_popularity AS popularity ON popularity.user_id = candidate.id
				WHERE ${discoveryConditions(viewer, options)}`,
		) ?? 0
	);
}