import { requireSession } from "@/lib/auth/guards";
import { listLikers } from "@/lib/db";
import { serializeUserSummary } from "@/lib/profile/summary";

export async function GET()
{
	const session = await requireSession();
	if (!session.ok)
	{
		return session.response;
	}

	const likers = listLikers(session.user.id).map((row) => ({
		...serializeUserSummary(row),
		liked_at: row.liked_at,
	}));

	return Response.json({ ok: true, likers });
}
