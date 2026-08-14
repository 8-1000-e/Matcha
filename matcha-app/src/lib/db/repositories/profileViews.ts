import { queryAll } from "../core/client";
import { boundedInteger } from "../core/identifiers";
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
	limit = 100,
): (UserSummaryRow & { viewed_at: string; visit_count: number })[] {
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
			ORDER BY viewed_at DESC
			LIMIT ${boundedInteger(limit, 1, 500, "limit")}`,
	);
}

export function listVisitHistory(
	viewerId: string,
	limit = 100,
): (UserSummaryRow & { viewed_at: string })[] {
	return queryAll<UserSummaryRow & { viewed_at: string }>(
		sql`SELECT ${SUMMARY_COLUMNS}, MAX(profile_views.viewed_at) AS viewed_at
			FROM profile_views
			JOIN user_profiles AS profiles ON profiles.id = profile_views.viewed_id
			WHERE profile_views.viewer_id = ${viewerId}
			GROUP BY profiles.id
			ORDER BY viewed_at DESC
			LIMIT ${boundedInteger(limit, 1, 500, "limit")}`,
	);
}
