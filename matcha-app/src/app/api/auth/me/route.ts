import { requireUser } from "@/lib/auth/session";
import { MINIMUM_TAGS, photos, userTags } from "@/lib/db";

export const runtime = "nodejs";

export async function GET()
{
	const user = await requireUser();
	if (!user)
	{
		return Response.json({ errors: ["unauthorized"] }, { status: 401 });
	}

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

	return Response.json({
		ok: true,
		user: {
			id: user.id,
			username: user.username,
			first_name: user.first_name,
			last_name: user.last_name,
			is_verified: user.is_verified === 1,
			profile_completed: user.profile_completed === 1,
			missing,
		},
	});
}
