import { execute, queryAll, queryOne, transaction } from "../core/client";
import { boundedInteger } from "../core/identifiers";
import { createRepository } from "../core/repository";
import { sql } from "../core/sql";
import { createId } from "../core/values";
import type {
	LikeInsert,
	LikeRow,
	MatchInsert,
	MatchRow,
	UserRow,
} from "../types";

export const likes = createRepository<LikeRow, LikeInsert>({
	table: "likes",
	columns: ["liker_id", "liked_id", "liked_at"],
	primaryKey: "liker_id",
});

export const matches = createRepository<MatchRow, MatchInsert>({
	table: "matches",
	columns: ["id", "user_a_id", "user_b_id", "connected_at", "is_active"],
	defaultOrder: [{ column: "connected_at", direction: "desc" }],
});

export interface LikeOutcome {
	liked: boolean;
	matched: boolean;
	match?: MatchRow;
}

function pair(first: string, second: string): [string, string] {
	return first < second ? [first, second] : [second, first];
}

export function findMatchBetween(
	first: string,
	second: string,
): MatchRow | undefined {
	const [userA, userB] = pair(first, second);
	return matches.findOne({ user_a_id: userA, user_b_id: userB });
}

export function hasLiked(likerId: string, likedId: string): boolean {
	return likes.exists({ liker_id: likerId, liked_id: likedId });
}

export function like(likerId: string, likedId: string): LikeOutcome {
	return transaction(() => {
		const inserted = execute(
			sql`INSERT INTO likes (liker_id, liked_id) VALUES (${likerId}, ${likedId})
				ON CONFLICT DO NOTHING`,
		);
		if (inserted.changes === 0) {
			const existing = findMatchBetween(likerId, likedId);
			return {
				liked: false,
				matched: existing?.is_active === 1,
				match: existing,
			};
		}
		const reciprocal = likes.exists({ liker_id: likedId, liked_id: likerId });
		if (!reciprocal) {
			return { liked: true, matched: false };
		}
		const [userA, userB] = pair(likerId, likedId);
		const existing = matches.findOne({ user_a_id: userA, user_b_id: userB });
		if (existing !== undefined) {
			const revived
				= existing.is_active === 1
					? existing
					: matches.updateById(existing.id, { is_active: 1 });
			return { liked: true, matched: true, match: revived ?? existing };
		}
		return {
			liked: true,
			matched: true,
			match: matches.insert({
				id: createId(),
				user_a_id: userA,
				user_b_id: userB,
			}),
		};
	});
}

export function unlike(likerId: string, likedId: string): boolean {
	return transaction(
		() => likes.remove({ liker_id: likerId, liked_id: likedId }) === 1,
	);
}

export function listLikers(likedId: string, limit = 100): UserRow[] {
	return queryAll<UserRow>(
		sql`SELECT users.* FROM users
			JOIN likes ON likes.liker_id = users.id
			WHERE likes.liked_id = ${likedId}
				AND NOT EXISTS (
					SELECT 1 FROM blocks
					WHERE (blocks.blocker_id = ${likedId} AND blocks.blocked_id = users.id)
						OR (blocks.blocker_id = users.id AND blocks.blocked_id = ${likedId})
				)
			ORDER BY likes.liked_at DESC
			LIMIT ${boundedInteger(limit, 1, 500, "limit")}`,
	);
}

export function listMatches(userId: string): (MatchRow & { partner_id: string })[] {
	return queryAll<MatchRow & { partner_id: string }>(
		sql`SELECT matches.*,
				CASE WHEN matches.user_a_id = ${userId}
					THEN matches.user_b_id ELSE matches.user_a_id END AS partner_id
			FROM matches
			WHERE (matches.user_a_id = ${userId} OR matches.user_b_id = ${userId})
				AND matches.is_active = 1
			ORDER BY matches.connected_at DESC`,
	);
}

export function findActiveMatchForUsers(
	matchId: string,
	userId: string,
): MatchRow | undefined {
	return queryOne<MatchRow>(
		sql`SELECT * FROM matches
			WHERE id = ${matchId}
				AND is_active = 1
				AND ${userId} IN (user_a_id, user_b_id)`,
	);
}
