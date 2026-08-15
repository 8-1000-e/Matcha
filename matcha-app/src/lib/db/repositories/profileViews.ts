import { queryAll, queryScalar } from "../core/client";
import { bounds, type PageOptions } from "../core/pagination";
import { createRepository } from "../core/repository";
import { sql } from "../core/sql";
import { createId } from "../core/values";
import { SUMMARY_COLUMNS, type UserSummaryRow } from "../queries/summaries";
import type { ProfileViewInsert, ProfileViewRow } from "../types";

export const profileViews = createRepository<
	ProfileViewRow,
	ProfileViewInsert
>({
	table: "profile_views",
	columns: ["id", "viewer_id", "viewed_id", "viewed_at"],
	defaultOrder: [{ column: "viewed_at", direction: "desc" }],
});

export function recordView(viewerId: string, viewedId: string): ProfileViewRow {
	return profileViews.insert({
		id: createId(),
		viewer_id: viewerId,
		viewed_id: viewedId,
	});
}

export function listViewers(
	viewedId: string,
	options: PageOptions = {},
): (UserSummaryRow & { viewed_at: string; visit_count: number })[] {
	const page = bounds(options);
	return queryAll<UserSummaryRow & { viewed_at: string; visit_count: number }>(
		sql`SELECT ${SUMMARY_COLUMNS},
				MAX(profile_views.viewed_at) AS viewed_at,
				COUNT(*) AS visit_count
			FROM profile_views
			JOIN user_profiles AS profiles ON profiles.id = profile_views.viewer_id
			WHERE profile_views.viewed_id = ${viewedId}
				AND NOT EXISTS (
					SELECT 1 FROM blocks
					WHERE (blocks.blocker_id = ${viewedId} AND blocks.blocked_id = profiles.id)
						OR (blocks.blocker_id = profiles.id AND blocks.blocked_id = ${viewedId})
				)
			GROUP BY profiles.id
			ORDER BY viewed_at DESC, profiles.id
			LIMIT ${page.limit} OFFSET ${page.offset}`,
	);
}

export function countViewers(viewedId: string): number {
	return (
		queryScalar<number>(
			sql`SELECT COUNT(DISTINCT profile_views.viewer_id)
				FROM profile_views
				JOIN user_profiles AS profiles ON profiles.id = profile_views.viewer_id
				WHERE profile_views.viewed_id = ${viewedId}
					AND NOT EXISTS (
						SELECT 1 FROM blocks
						WHERE (blocks.blocker_id = ${viewedId} AND blocks.blocked_id = profiles.id)
							OR (blocks.blocker_id = profiles.id AND blocks.blocked_id = ${viewedId})
					)`,
		) ?? 0
	);
}

export function listVisitHistory(
	viewerId: string,
	options: PageOptions = {},
): (UserSummaryRow & { viewed_at: string })[] {
	const page = bounds(options);
	return queryAll<UserSummaryRow & { viewed_at: string }>(
		sql`SELECT ${SUMMARY_COLUMNS}, MAX(profile_views.viewed_at) AS viewed_at
			FROM profile_views
			JOIN user_profiles AS profiles ON profiles.id = profile_views.viewed_id
			WHERE profile_views.viewer_id = ${viewerId}
				AND NOT EXISTS (
					SELECT 1 FROM blocks
					WHERE (blocks.blocker_id = ${viewerId} AND blocks.blocked_id = profiles.id)
						OR (blocks.blocker_id = profiles.id AND blocks.blocked_id = ${viewerId})
				)
			GROUP BY profiles.id
			ORDER BY viewed_at DESC, profiles.id
			LIMIT ${page.limit} OFFSET ${page.offset}`,
	);
}

export function countVisitHistory(viewerId: string): number {
	return (
		queryScalar<number>(
			sql`SELECT COUNT(DISTINCT profile_views.viewed_id)
				FROM profile_views
				JOIN user_profiles AS profiles ON profiles.id = profile_views.viewed_id
				WHERE profile_views.viewer_id = ${viewerId}
					AND NOT EXISTS (
						SELECT 1 FROM blocks
						WHERE (blocks.blocker_id = ${viewerId} AND blocks.blocked_id = profiles.id)
							OR (blocks.blocker_id = profiles.id AND blocks.blocked_id = ${viewerId})
					)`,
		) ?? 0
	);
}
