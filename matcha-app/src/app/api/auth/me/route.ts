import { requireUser } from "@/lib/auth/session";
import { missingProfileFields } from "@/lib/profile/profile";

export async function GET()
{
	const user = await requireUser();
	if (!user)
	{
		return Response.json({ errors: ["unauthorized"] }, { status: 401 });
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
			missing: missingProfileFields(user),
		},
	});
}
