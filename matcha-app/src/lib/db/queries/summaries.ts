import { queryOne } from "../core/client";
import { raw, sql, type SqlFragment } from "../core/sql";
import type { Flag } from "../core/values";
import { onlineNow } from "../schema/views";

export interface UserSummaryRow {
	id: string;
	username: string;
	first_name: string;
	age: number;
	city: string | null;
	neighborhood: string | null;
	is_online: Flag;
	last_seen_at: string | null;
	review_average: number;
	review_count: number;
	profile_photo_id: string | null;
}

export const SUMMARY_COLUMNS: SqlFragment = raw(`profiles.id,
	profiles.username,
	profiles.first_name,
	profiles.age,
	profiles.city,
	profiles.neighborhood,
	${onlineNow("profiles.last_seen_at")} AS is_online,
	profiles.last_seen_at,
	profiles.review_average,
	profiles.review_count,
	(
		SELECT photos.id FROM photos
		WHERE photos.user_id = profiles.id AND photos.is_profile = 1
	) AS profile_photo_id`);

export function findUserSummary(userId: string): UserSummaryRow | undefined {
	return queryOne<UserSummaryRow>(
		sql`SELECT ${SUMMARY_COLUMNS}
			FROM user_profiles AS profiles
			WHERE profiles.id = ${userId}`,
	);
}
