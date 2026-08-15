import type { DiscoveryRow, Gender, Orientation } from "@/lib/db";

export interface CandidatePayload {
	id: string;
	username: string;
	first_name: string;
	last_name: string;
	age: number;
	gender: Gender | null;
	orientation: Orientation;
	biography: string | null;
	city: string | null;
	neighborhood: string | null;
	distance_km: number | null;
	common_tags: number;
	review_average: number;
	review_count: number;
	photo_count: number;
	profile_photo_id: string | null;
	photo_ids: string | null;
	tags: string | null;
	is_online: boolean;
	last_seen_at: string | null;
	created_at: string;
	viewer_liked: boolean;
}

export function serializeCandidate(row: DiscoveryRow): CandidatePayload {
	return {
		id: row.id,
		username: row.username,
		first_name: row.first_name,
		last_name: row.last_name,
		age: row.age,
		gender: row.gender,
		orientation: row.orientation,
		biography: row.biography,
		city: row.city,
		neighborhood: row.neighborhood,
		distance_km: row.distance_km,
		common_tags: row.common_tags,
		review_average: row.review_average,
		review_count: row.review_count,
		photo_count: row.photo_count,
		profile_photo_id: row.profile_photo_id,
		photo_ids: row.photo_ids,
		tags: row.tags,
		is_online: row.is_online === 1,
		last_seen_at: row.last_seen_at,
		created_at: row.created_at,
		viewer_liked: row.viewer_liked === 1,
	};
}
