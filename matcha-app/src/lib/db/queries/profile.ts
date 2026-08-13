import { queryOne } from "../core/client";
import { raw, sql } from "../core/sql";
import type { Flag } from "../core/values";
import { ageYears } from "../schema/views";
import type { UserRow } from "../types";

export interface ProfileRelationship {
	viewer_liked_target: Flag;
	target_liked_viewer: Flag;
	is_connected: Flag;
	match_id: string | null;
	viewer_blocked_target: Flag;
	target_blocked_viewer: Flag;
	viewer_reported_target: Flag;
	viewer_review_score: number | null;
}

export interface PublicProfile
	extends Omit<UserRow, "email" | "password_hash">,
	ProfileRelationship {
	age: number;
	distance_km: number | null;
	common_tags: number;
	review_average: number;
	review_count: number;
	profile_photo_path: string | null;
}

export function findPublicProfile(
	viewer: UserRow,
	targetId: string,
): PublicProfile | undefined {
	return queryOne<PublicProfile>(
		sql`SELECT
				target.id, target.username, target.first_name, target.last_name,
				target.birth_date, target.gender, target.orientation,
				target.biography, target.is_verified, target.profile_completed,
				target.latitude, target.longitude, target.city, target.neighborhood,
				target.location_consent, target.is_online, target.last_seen_at,
				target.created_at,
				${raw(ageYears("target.birth_date"))} AS age,
				distance_km(
					${viewer.latitude}, ${viewer.longitude},
					target.latitude, target.longitude
				) AS distance_km,
				popularity.review_average AS review_average,
				popularity.review_count AS review_count,
				(
					SELECT path FROM photos
					WHERE photos.user_id = target.id AND photos.is_profile = 1
				) AS profile_photo_path,
				(
					SELECT COUNT(*) FROM user_tags AS theirs
					JOIN user_tags AS mine ON mine.tag_id = theirs.tag_id
					WHERE theirs.user_id = target.id AND mine.user_id = ${viewer.id}
				) AS common_tags,
				EXISTS (
					SELECT 1 FROM likes
					WHERE likes.liker_id = ${viewer.id} AND likes.liked_id = target.id
				) AS viewer_liked_target,
				EXISTS (
					SELECT 1 FROM likes
					WHERE likes.liker_id = target.id AND likes.liked_id = ${viewer.id}
				) AS target_liked_viewer,
				EXISTS (
					SELECT 1 FROM matches
					WHERE matches.is_active = 1
						AND matches.user_a_id = MIN(${viewer.id}, target.id)
						AND matches.user_b_id = MAX(${viewer.id}, target.id)
				) AS is_connected,
				(
					SELECT id FROM matches
					WHERE matches.user_a_id = MIN(${viewer.id}, target.id)
						AND matches.user_b_id = MAX(${viewer.id}, target.id)
				) AS match_id,
				EXISTS (
					SELECT 1 FROM blocks
					WHERE blocks.blocker_id = ${viewer.id} AND blocks.blocked_id = target.id
				) AS viewer_blocked_target,
				EXISTS (
					SELECT 1 FROM blocks
					WHERE blocks.blocker_id = target.id AND blocks.blocked_id = ${viewer.id}
				) AS target_blocked_viewer,
				EXISTS (
					SELECT 1 FROM reports
					WHERE reports.reporter_id = ${viewer.id}
						AND reports.reported_id = target.id
				) AS viewer_reported_target,
				(
					SELECT score FROM reviews
					WHERE reviews.author_id = ${viewer.id} AND reviews.target_id = target.id
				) AS viewer_review_score
			FROM users AS target
			JOIN user_popularity AS popularity ON popularity.user_id = target.id
			WHERE target.id = ${targetId}`,
	);
}
