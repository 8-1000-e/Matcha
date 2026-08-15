import { requireSession } from "@/lib/auth/guards";
import { listLiked, listLikers } from "@/lib/db";
import { serializeUserSummary } from "@/lib/profile/summary";

const SCOPES = ["received", "sent"] as const;

type Scope = (typeof SCOPES)[number];

function isScope(value: string): value is Scope
{
	return (SCOPES as readonly string[]).includes(value);
}

export async function GET(request: Request)
{
	const session = await requireSession();
	if (!session.ok)
	{
		return session.response;
	}

	const scope = new URL(request.url).searchParams.get("scope") ?? "received";
	if (!isScope(scope))
	{
		return Response.json(
			{ errors: ["scope must be received or sent"] },
			{ status: 400 },
		);
	}

	const rows
		= scope === "sent"
			? listLiked(session.user.id)
			: listLikers(session.user.id);

	const likers = rows.map((row) => ({
		...serializeUserSummary(row),
		liked_at: row.liked_at,
	}));

	return Response.json({ ok: true, scope, likers });
}
