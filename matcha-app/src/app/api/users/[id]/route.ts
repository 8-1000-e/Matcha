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
	});
	if (!guarded.ok)
	{
		return guarded.response;
	}

	const profile = findPublicProfile(guarded.viewer, id);
	if (profile === undefined)
	{
		return Response.json({ errors: ["user not found"] }, { status: 404 });
	}

	return Response.json({ ok: true, profile: buildPublicProfile(profile) });
}
