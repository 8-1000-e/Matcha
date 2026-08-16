import { queryAll, queryOne, transaction } from "../core/client";
import { DatabaseError } from "../core/errors";
import { boundedInteger } from "../core/identifiers";
import { createRepository } from "../core/repository";
import { sql } from "../core/sql";
import { createId } from "../core/values";
import {
	REVIEW_MIN_MESSAGES,
	type PopularityRow,
	type ReviewInsert,
	type ReviewRow,
} from "../types";

export const reviews = createRepository<ReviewRow, ReviewInsert>({
	table: "reviews",
	columns: [
		"id",
		"author_id",
		"target_id",
		"score",
		"body",
		"created_at",
		"updated_at",
	],
	defaultOrder: [{ column: "created_at", direction: "desc" }],
});

export function countExchangedMessages(first: string, second: string): number {
	const row = queryOne<{ total: number; mine: number; theirs: number }>(
		sql`SELECT
				COUNT(*) AS total,
				COUNT(*) FILTER (WHERE messages.sender_id = ${first}) AS mine,
				COUNT(*) FILTER (WHERE messages.sender_id = ${second}) AS theirs
			FROM messages
			JOIN matches ON matches.id = messages.match_id
			WHERE messages.kind = 'text'
				AND matches.user_a_id = MIN(${first}, ${second})
				AND matches.user_b_id = MAX(${first}, ${second})`,
	);
	if (row === undefined || row.mine === 0 || row.theirs === 0) {
		return 0;
	}
	return row.total;
}

export function canReview(authorId: string, targetId: string): boolean {
	return countExchangedMessages(authorId, targetId) >= REVIEW_MIN_MESSAGES;
}

export function upsertReview(values: ReviewInsert): ReviewRow {
	if (!Number.isInteger(values.score) || values.score < 1 || values.score > 5) {
		throw new DatabaseError("review_score_out_of_range");
	}
	return transaction(() => {
		const existing = reviews.findOne({
			author_id: values.author_id,
			target_id: values.target_id,
		});
		if (existing !== undefined) {
			const updated = reviews.updateById(existing.id, {
				score: values.score,
				body: values.body ?? null,
			});
			if (updated === undefined) {
				throw new DatabaseError("review_update_failed");
			}
			const refreshed = reviews.findById(existing.id);
			if (refreshed === undefined) {
				throw new DatabaseError("review_update_failed");
			}
			return refreshed;
		}
		return reviews.insert({ ...values, id: values.id ?? createId() });
	});
}

export function removeReview(authorId: string, targetId: string): boolean {
	return reviews.remove({ author_id: authorId, target_id: targetId }) === 1;
}

export function listVisibleReviews(
	targetId: string,
	limit = 50,
): (ReviewRow & { author_username: string })[] {
	return queryAll<ReviewRow & { author_username: string }>(
		sql`SELECT reviews.*, users.username AS author_username
			FROM reviews
			JOIN users ON users.id = reviews.author_id
			WHERE reviews.target_id = ${targetId}
			ORDER BY reviews.updated_at DESC
			LIMIT ${boundedInteger(limit, 1, 200, "limit")}`,
	);
}

export function findPopularity(userId: string): PopularityRow | undefined {
	return queryOne<PopularityRow>(
		sql`SELECT * FROM user_popularity WHERE user_id = ${userId}`,
	);
}