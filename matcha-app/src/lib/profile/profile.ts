import {
	listPhotos,
	listUserTags,
	MINIMUM_TAGS,
	photos,
	purgeDate,
	refreshProfileCompletion,
	userTags,
	users,
	type Gender,
	type Orientation,
	type UserRow,
} from "@/lib/db";

export interface ProfilePhoto {
	id: string;
	url: string;
	is_profile: boolean;
	position: number;
}

export interface ProfilePayload {
	id: string;
	email: string;
	username: string;
	first_name: string;
	last_name: string;
	birth_date: string;
	gender: Gender | null;
	orientation: Orientation;
	biography: string | null;
	city: string | null;
	neighborhood: string | null;
	latitude: number | null;
	longitude: number | null;
	location_consent: boolean;
	location_updated_at: string | null;
	tags: string[];
	photos: ProfilePhoto[];
	is_verified: boolean;
	profile_completed: boolean;
	missing: string[];
	deleted_at: string | null;
	purge_at: string | null;
}

export function missingProfileFields(user: UserRow): string[]
{
	const missing: string[] = [];

	if (user.gender === null)
	{
		missing.push("gender");
	}
	if (user.biography === null || user.biography.trim().length === 0)
	{
		missing.push("biography");
	}
	if (userTags.count({ user_id: user.id }) < MINIMUM_TAGS)
	{
		missing.push("tags");
	}
	if (photos.count({ user_id: user.id, is_profile: 1 }) === 0)
	{
		missing.push("profile_photo");
	}
	if (user.latitude === null && user.city === null)
	{
		missing.push("location");
	}

	return missing;
}

export function buildProfile(user: UserRow): ProfilePayload
{
	return {
		id: user.id,
		email: user.email,
		username: user.username,
		first_name: user.first_name,
		last_name: user.last_name,
		birth_date: user.birth_date,
		gender: user.gender,
		orientation: user.orientation,
		biography: user.biography,
		city: user.city,
		neighborhood: user.neighborhood,
		latitude: user.latitude,
		longitude: user.longitude,
		location_consent: user.location_consent === 1,
		location_updated_at: user.location_updated_at,
		tags: listUserTags(user.id).map((tag) => tag.label),
		photos: listPhotos(user.id).map((photo) => ({
			id: photo.id,
			url: `/api/photos/${photo.id}`,
			is_profile: photo.is_profile === 1,
			position: photo.position,
		})),
		is_verified: user.is_verified === 1,
		profile_completed: user.profile_completed === 1,
		missing: missingProfileFields(user),
		deleted_at: user.deleted_at,
		purge_at: user.deleted_at === null ? null : purgeDate(user.deleted_at),
	};
}

export function refreshedProfile(userId: string): ProfilePayload | null
{
	refreshProfileCompletion(userId);

	const user = users.findOne({ id: userId });
	return user ? buildProfile(user) : null;
}

export function profileResponse(userId: string, status = 200): Response
{
	const profile = refreshedProfile(userId);
	if (!profile)
	{
		return Response.json({ errors: ["unauthorized"] }, { status: 401 });
	}

	return Response.json({ ok: true, profile }, { status });
}
