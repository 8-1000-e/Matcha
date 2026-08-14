import {
	listPhotos,
	listUserTags,
	type Gender,
	type Orientation,
	type PublicProfile,
} from "@/lib/db";
import type { ProfilePhoto } from "./profile";

export interface PublicProfilePayload {
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
	tags: string[];
	photos: ProfilePhoto[];
	common_tags: number;
	popularity_score: number;
	review_average: number;
	review_count: number;
	is_online: boolean;
	last_seen_at: string | null;
	created_at: string;
	viewer_liked_target: boolean;
	target_liked_viewer: boolean;
	is_connected: boolean;
	match_id: string | null;
	viewer_blocked_target: boolean;
	viewer_reported_target: boolean;
	viewer_review_score: number | null;
}

export function buildPublicProfile(
	profile: PublicProfile,
): PublicProfilePayload
{
	return {
		id: profile.id,
		username: profile.username,
		first_name: profile.first_name,
		last_name: profile.last_name,
		age: profile.age,
		gender: profile.gender,
		orientation: profile.orientation,
		biography: profile.biography,
		city: profile.city,
		neighborhood: profile.neighborhood,
		distance_km: profile.distance_km,
		tags: listUserTags(profile.id).map((tag) => tag.label),
		photos: listPhotos(profile.id).map((photo) => ({
			id: photo.id,
			url: `/api/photos/${photo.id}`,
			is_profile: photo.is_profile === 1,
			position: photo.position,
		})),
		common_tags: profile.common_tags,
		popularity_score: profile.popularity_score,
		review_average: profile.review_average,
		review_count: profile.review_count,
		is_online: profile.is_online === 1,
		last_seen_at: profile.last_seen_at,
		created_at: profile.created_at,
		viewer_liked_target: profile.viewer_liked_target === 1,
		target_liked_viewer: profile.target_liked_viewer === 1,
		is_connected: profile.is_connected === 1,
		match_id: profile.match_id,
		viewer_blocked_target: profile.viewer_blocked_target === 1,
		viewer_reported_target: profile.viewer_reported_target === 1,
		viewer_review_score: profile.viewer_review_score,
	};
}
