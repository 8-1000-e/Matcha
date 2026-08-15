import { findPublicProfile } from "@/lib/db";
import { buildPublicProfile } from "@/lib/profile/public";
import { requireTarget } from "@/lib/profile/target";

interface Context {
	params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: Context)
{
	const { id } = await context.params;
	const guarded = await requireTarget(id, {
		selfError: "use /api/profile for your own profile",
		allowBlocked: true,
	});
	if (!guarded.ok)
	{
		return guarded.response;
	}

	if (guarded.blocked.mine || guarded.blocked.theirs)
	{
		return Response.json(
			{
				errors: ["profile_blocked"],
				code: guarded.blocked.mine ? "blocked_by_me" : "blocked_by_them",
			},
			{ status: 403 },
		);
	}

	const profile = findPublicProfile(guarded.viewer, id);
	if (profile === undefined)
	{
		return Response.json({ errors: ["user not found"] }, { status: 404 });
	}

	return Response.json({ ok: true, profile: buildPublicProfile(profile) });
}
