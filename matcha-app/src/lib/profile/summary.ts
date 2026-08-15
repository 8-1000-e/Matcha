import type { UserSummaryRow } from "@/lib/db";

export interface UserSummary {
	id: string;
	username: string;
	first_name: string;
	age: number;
	city: string | null;
	neighborhood: string | null;
	popularity_score: number;
	photo_url: string | null;
	is_online: boolean;
	last_seen_at: string | null;
}

export function serializeUserSummary(row: UserSummaryRow): UserSummary
{
	return {
		id: row.id,
		username: row.username,
		first_name: row.first_name,
		age: row.age,
		city: row.city,
		neighborhood: row.neighborhood,
		popularity_score: row.popularity_score,
		photo_url:
			row.profile_photo_id === null
				? null
				: `/api/photos/${row.profile_photo_id}`,
		is_online: row.is_online === 1,
		last_seen_at: row.last_seen_at,
	};
}
