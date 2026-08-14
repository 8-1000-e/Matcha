import { requireSession } from "@/lib/auth/guards";
import { listViewers, listVisitHistory } from "@/lib/db";
import { serializeUserSummary } from "@/lib/profile/summary";

const SCOPES = ["received", "made"] as const;

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
			{ errors: ["scope must be received or made"] },
			{ status: 400 },
		);
	}

	const views
		= scope === "made"
			? listVisitHistory(session.user.id).map((row) => ({
				...serializeUserSummary(row),
				viewed_at: row.viewed_at,
			}))
			: listViewers(session.user.id).map((row) => ({
				...serializeUserSummary(row),
				viewed_at: row.viewed_at,
				visit_count: row.visit_count,
			}));

	return Response.json({ ok: true, scope, views });
}
