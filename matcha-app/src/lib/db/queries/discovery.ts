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
import { ageYears } from "../schema/views";
import { GENDERS, type Gender, type UserRow } from "../types";

const SORT_COLUMNS = {
	distance: "distance_km",
	age: "age",
	popularity: "popularity_score",
	common_tags: "common_tags",
	last_seen: "last_seen_at",
	created: "created_at",
} as const;

const SORT_KEYS = Object.keys(SORT_COLUMNS) as (keyof typeof SORT_COLUMNS)[];

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
}

export interface DiscoveryRow extends UserRow {
	age: number;
	distance_km: number | null;
	common_tags: number;
	popularity_score: number;
	review_average: number;
	review_count: number;
	photo_count: number;
	profile_photo_path: string | null;
}

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
			WHEN 'hetero' THEN candidate.gender IS NOT ${viewer.gender}
			WHEN 'homo' THEN candidate.gender IS ${viewer.gender}
			ELSE 1 END`,
		sql`CASE candidate.orientation
			WHEN 'hetero' THEN ${viewer.gender} IS NOT candidate.gender
			WHEN 'homo' THEN ${viewer.gender} IS candidate.gender
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
			sql`popularity.popularity_score >= ${finiteNumber(
				filters.popularityMin,
				0,
				100,
				"popularityMin",
			)}`,
		);
	}
	if (filters.popularityMax !== undefined) {
		clauses.push(
			sql`popularity.popularity_score <= ${finiteNumber(
				filters.popularityMax,
				0,
				100,
				"popularityMax",
			)}`,
		);
	}
	if (filters.maxDistanceKm !== undefined) {
		clauses.push(
			sql`distance_km(
				${viewer.latitude}, ${viewer.longitude},
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
		clauses.push(raw("candidate.is_online = 1"));
	}
	if (filters.usernameQuery !== undefined) {
		clauses.push(sql`candidate.username ${startsWith(filters.usernameQuery)}`);
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
		return raw("ORDER BY popularity_score DESC, candidate.id");
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
		...filterClauses(viewer, filters),
	]);
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
		sql`SELECT
				candidate.*,
				${raw(ageYears("candidate.birth_date"))} AS age,
				distance_km(
					${viewer.latitude}, ${viewer.longitude},
					candidate.latitude, candidate.longitude
				) AS distance_km,
				(
					SELECT COUNT(*) FROM user_tags AS theirs
					JOIN user_tags AS mine ON mine.tag_id = theirs.tag_id
					WHERE theirs.user_id = candidate.id AND mine.user_id = ${viewer.id}
				) AS common_tags,
				popularity.popularity_score AS popularity_score,
				popularity.review_average AS review_average,
				popularity.review_count AS review_count,
				(SELECT COUNT(*) FROM photos WHERE photos.user_id = candidate.id)
					AS photo_count,
				(
					SELECT path FROM photos
					WHERE photos.user_id = candidate.id AND photos.is_profile = 1
				) AS profile_photo_path
			FROM users AS candidate
			JOIN user_popularity AS popularity ON popularity.user_id = candidate.id
			WHERE ${conditions}
			${ordering(options.sort ?? DEFAULT_SORT)}
			LIMIT ${limit} OFFSET ${offset}`,
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
