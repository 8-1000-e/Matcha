import { execute, queryAll, queryScalar } from "../core/client";
import { createRepository } from "../core/repository";
import { sql } from "../core/sql";
import { createId } from "../core/values";
import type {
	BlockInsert,
	BlockRow,
	ReportInsert,
	ReportRow,
	UserRow,
} from "../types";

export const blocks = createRepository<BlockRow, BlockInsert>({
	table: "blocks",
	columns: ["blocker_id", "blocked_id", "blocked_at"],
	primaryKey: "blocker_id",
});

export const reports = createRepository<ReportRow, ReportInsert>({
	table: "reports",
	columns: [
		"id",
		"reporter_id",
		"reported_id",
		"target_review_id",
		"reason",
		"reported_at",
	],
});

export function block(blockerId: string, blockedId: string): boolean {
	return (
		execute(
			sql`INSERT INTO blocks (blocker_id, blocked_id)
				VALUES (${blockerId}, ${blockedId})
				ON CONFLICT DO NOTHING`,
		).changes === 1
	);
}

export function unblock(blockerId: string, blockedId: string): boolean {
	return blocks.remove({ blocker_id: blockerId, blocked_id: blockedId }) === 1;
}

export function isBlockedEitherWay(first: string, second: string): boolean {
	return (
		queryScalar<number>(
			sql`SELECT 1 FROM blocks
				WHERE (blocker_id = ${first} AND blocked_id = ${second})
					OR (blocker_id = ${second} AND blocked_id = ${first})
				LIMIT 1`,
		) === 1
	);
}

export function listBlocked(blockerId: string): UserRow[] {
	return queryAll<UserRow>(
		sql`SELECT users.* FROM users
			JOIN blocks ON blocks.blocked_id = users.id
			WHERE blocks.blocker_id = ${blockerId}
			ORDER BY blocks.blocked_at DESC`,
	);
}

export function report(values: ReportInsert): ReportRow | undefined {
	const id = values.id ?? createId();
	const inserted = execute(
		sql`INSERT INTO reports
				(id, reporter_id, reported_id, target_review_id, reason)
			VALUES (
				${id},
				${values.reporter_id},
				${values.reported_id},
				${values.target_review_id ?? null},
				${values.reason}
			)
			ON CONFLICT DO NOTHING`,
	);
	if (inserted.changes === 0) {
		return reports.findOne({
			reporter_id: values.reporter_id,
			reported_id: values.reported_id,
		});
	}
	return reports.findById(id);
}
