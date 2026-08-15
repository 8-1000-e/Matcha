import {
	execute,
	queryAll,
	queryOne,
	queryScalar,
	transaction,
} from "../core/client";
import { boundedInteger } from "../core/identifiers";
import { contains } from "../core/operators";
import { bounds, type PageOptions } from "../core/pagination";
import { createRepository } from "../core/repository";
import { every, sql, when } from "../core/sql";
import { createId } from "../core/values";
import { SUMMARY_COLUMNS, type UserSummaryRow } from "../queries/summaries";
import type {
	CallStatus,
	LikeInsert,
	LikeRow,
	MatchInsert,
	MatchRow,
	MessageKind,
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

export interface UnlikeOutcome {
	unliked: boolean;
	disconnected: boolean;
	match_id: string | null;
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

export function unlike(likerId: string, likedId: string): UnlikeOutcome {
	return transaction(() => {
		const existing = findMatchBetween(likerId, likedId);
		const wasConnected = existing?.is_active === 1;
		if (likes.remove({ liker_id: likerId, liked_id: likedId }) === 0) {
			return { unliked: false, disconnected: false, match_id: null };
		}
		return {
			unliked: true,
			disconnected: wasConnected,
			match_id: wasConnected ? (existing?.id ?? null) : null,
		};
	});
}

export function listLikers(
	likedId: string,
	options: PageOptions = {},
): (UserSummaryRow & { liked_at: string })[] {
	const page = bounds(options);
	return queryAll<UserSummaryRow & { liked_at: string }>(
		sql`SELECT ${SUMMARY_COLUMNS}, likes.liked_at AS liked_at
			FROM user_profiles AS profiles
			JOIN likes ON likes.liker_id = profiles.id
			WHERE likes.liked_id = ${likedId}
				AND NOT EXISTS (
					SELECT 1 FROM blocks
					WHERE (blocks.blocker_id = ${likedId} AND blocks.blocked_id = profiles.id)
						OR (blocks.blocker_id = profiles.id AND blocks.blocked_id = ${likedId})
				)
			ORDER BY likes.liked_at DESC, profiles.id
			LIMIT ${page.limit} OFFSET ${page.offset}`,
	);
}

export function countLikers(likedId: string): number {
	return (
		queryScalar<number>(
			sql`SELECT COUNT(*)
				FROM user_profiles AS profiles
				JOIN likes ON likes.liker_id = profiles.id
				WHERE likes.liked_id = ${likedId}
					AND NOT EXISTS (
						SELECT 1 FROM blocks
						WHERE (blocks.blocker_id = ${likedId} AND blocks.blocked_id = profiles.id)
							OR (blocks.blocker_id = profiles.id AND blocks.blocked_id = ${likedId})
					)`,
		) ?? 0
	);
}

export function listLiked(
	likerId: string,
	options: PageOptions = {},
): (UserSummaryRow & { liked_at: string })[] {
	const page = bounds(options);
	return queryAll<UserSummaryRow & { liked_at: string }>(
		sql`SELECT ${SUMMARY_COLUMNS}, likes.liked_at AS liked_at
			FROM user_profiles AS profiles
			JOIN likes ON likes.liked_id = profiles.id
			WHERE likes.liker_id = ${likerId}
				AND NOT EXISTS (
					SELECT 1 FROM blocks
					WHERE (blocks.blocker_id = ${likerId} AND blocks.blocked_id = profiles.id)
						OR (blocks.blocker_id = profiles.id AND blocks.blocked_id = ${likerId})
				)
			ORDER BY likes.liked_at DESC, profiles.id
			LIMIT ${page.limit} OFFSET ${page.offset}`,
	);
}

export function countLiked(likerId: string): number {
	return (
		queryScalar<number>(
			sql`SELECT COUNT(*)
				FROM user_profiles AS profiles
				JOIN likes ON likes.liked_id = profiles.id
				WHERE likes.liker_id = ${likerId}
					AND NOT EXISTS (
						SELECT 1 FROM blocks
						WHERE (blocks.blocker_id = ${likerId} AND blocks.blocked_id = profiles.id)
							OR (blocks.blocker_id = profiles.id AND blocks.blocked_id = ${likerId})
					)`,
		) ?? 0
	);
}

export interface MatchListRow extends MatchRow {
	partner_id: string;
	last_kind: MessageKind | null;
	last_body: string | null;
	last_call_status: CallStatus | null;
	last_call_duration_s: number | null;
	last_sent_at: string | null;
	last_sender_id: string | null;
	activity_at: string;
}

export interface MatchCursor {
	activity_at: string;
	id: string;
}

export interface MatchListOptions {
	limit?: number;
	before?: MatchCursor;
	query?: string;
}

export function listMatches(
	userId: string,
	options: MatchListOptions = {},
): MatchListRow[] {
	const limit = boundedInteger(options.limit ?? 50, 1, 100, "limit");
	const query = options.query?.trim() ?? "";
	const before = options.before;

	const conditions = every([
		sql`${userId} IN (matches.user_a_id, matches.user_b_id)`,
		sql`matches.is_active = 1`,
		sql`NOT EXISTS (
			SELECT 1 FROM blocks
			WHERE (blocks.blocker_id = ${userId} AND blocks.blocked_id = partner.id)
				OR (blocks.blocker_id = partner.id AND blocks.blocked_id = ${userId})
		)`,
		when(
			query.length > 0,
			() =>
				sql`(partner.first_name ${contains(query)}
					OR partner.username ${contains(query)})`,
		),
		when(
			before !== undefined,
			() =>
				sql`(COALESCE(last.sent_at, matches.connected_at), matches.id)
					< (${before?.activity_at}, ${before?.id})`,
		),
	]);

	return queryAll<MatchListRow>(
		sql`SELECT matches.*,
				partner.id AS partner_id,
				last.kind AS last_kind,
				last.body AS last_body,
				last.call_status AS last_call_status,
				last.call_duration_s AS last_call_duration_s,
				last.sent_at AS last_sent_at,
				last.sender_id AS last_sender_id,
				COALESCE(last.sent_at, matches.connected_at) AS activity_at
			FROM matches
			JOIN users AS partner ON partner.id = CASE
				WHEN matches.user_a_id = ${userId}
					THEN matches.user_b_id ELSE matches.user_a_id END
			LEFT JOIN messages AS last ON last.id = (
				SELECT messages.id FROM messages
				WHERE messages.match_id = matches.id
				ORDER BY messages.sent_at DESC, messages.id DESC
				LIMIT 1
			)
			WHERE ${conditions}
			ORDER BY activity_at DESC, matches.id DESC
			LIMIT ${limit}`,
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
