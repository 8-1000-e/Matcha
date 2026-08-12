import { execute, queryAll, queryScalar } from "../core/client";
import { DatabaseError } from "../core/errors";
import { boundedInteger } from "../core/identifiers";
import { createRepository } from "../core/repository";
import { sql } from "../core/sql";
import { createId, nowIso } from "../core/values";
import type { MessageInsert, MessageRow } from "../types";
import { findActiveMatchForUsers } from "./likes";

export const messages = createRepository<MessageRow, MessageInsert>({
	table: "messages",
	columns: ["id", "match_id", "sender_id", "body", "sent_at", "read_at"],
	defaultOrder: [{ column: "sent_at", direction: "asc" }],
});

export function sendMessage(
	matchId: string,
	senderId: string,
	body: string,
): MessageRow {
	if (findActiveMatchForUsers(matchId, senderId) === undefined) {
		throw new DatabaseError("match_inactive");
	}
	return messages.insert({
		id: createId(),
		match_id: matchId,
		sender_id: senderId,
		body,
	});
}

export function listConversation(
	matchId: string,
	options?: { limit?: number; before?: string },
): MessageRow[] {
	const limit = boundedInteger(options?.limit ?? 50, 1, 200, "limit");
	const before = options?.before ?? null;
	const rows = queryAll<MessageRow>(
		sql`SELECT * FROM messages
			WHERE match_id = ${matchId}
				AND (${before} IS NULL OR sent_at < ${before})
			ORDER BY sent_at DESC
			LIMIT ${limit}`,
	);
	return rows.reverse();
}

export function markConversationRead(matchId: string, readerId: string): number {
	return execute(
		sql`UPDATE messages SET read_at = ${nowIso()}
			WHERE match_id = ${matchId}
				AND sender_id <> ${readerId}
				AND read_at IS NULL`,
	).changes;
}

export function countUnreadMessages(userId: string): number {
	return (
		queryScalar<number>(
			sql`SELECT COUNT(*) FROM messages
				JOIN matches ON matches.id = messages.match_id
				WHERE messages.read_at IS NULL
					AND messages.sender_id <> ${userId}
					AND matches.is_active = 1
					AND ${userId} IN (matches.user_a_id, matches.user_b_id)`,
		) ?? 0
	);
}

export function listUnreadByMatch(
	userId: string,
): { match_id: string; unread_count: number }[] {
	return queryAll<{ match_id: string; unread_count: number }>(
		sql`SELECT messages.match_id AS match_id, COUNT(*) AS unread_count
			FROM messages
			JOIN matches ON matches.id = messages.match_id
			WHERE messages.read_at IS NULL
				AND messages.sender_id <> ${userId}
				AND matches.is_active = 1
				AND ${userId} IN (matches.user_a_id, matches.user_b_id)
			GROUP BY messages.match_id`,
	);
}
