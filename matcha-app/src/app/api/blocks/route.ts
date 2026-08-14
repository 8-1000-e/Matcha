import { requireSession } from "@/lib/auth/guards";
import { listBlocked } from "@/lib/db";
import { serializeUserSummary } from "@/lib/profile/summary";

export async function GET()
{
	const session = await requireSession();
	if (!session.ok)
	{
		return session.response;
	}

	const blocked = listBlocked(session.user.id).map((row) => ({
		...serializeUserSummary(row),
		blocked_at: row.blocked_at,
	}));

	return Response.json({ ok: true, blocked });
}
