import { requireAnySession } from "@/lib/auth/guards";
import { purgeDate, restoreUser } from "@/lib/db";
import { refreshedProfile } from "@/lib/profile/profile";

export async function POST()
{
	const session = await requireAnySession();
	if (!session.ok)
	{
		return session.response;
	}

	const deletedAt = session.user.deleted_at;
	if (deletedAt === null)
	{
		return Response.json({ errors: ["account is not deleted"] }, { status: 409 });
	}

	if (purgeDate(deletedAt) <= new Date().toISOString())
	{
		return Response.json({ errors: ["grace_period_over"] }, { status: 410 });
	}

	if (!restoreUser(session.user.id))
	{
		return Response.json({ errors: ["account is not deleted"] }, { status: 409 });
	}

	const profile = refreshedProfile(session.user.id);
	if (!profile)
	{
		return Response.json({ errors: ["unauthorized"] }, { status: 401 });
	}

	return Response.json({ ok: true, profile });
}
