import { requireSession } from "@/lib/auth/guards";
import { listViewers, listVisitHistory } from "@/lib/db";
import { serializeUserSummary } from "@/lib/profile/summary";

export async function GET(request: Request)
{
	const session = await requireSession();
	if (!session.ok)
	{
		return session.response;
	}

	const scope = new URL(request.url).searchParams.get("scope") ?? "received";
	if (scope !== "received" && scope !== "made")
	{
		return Response.json(
			{ errors: ["scope must be received or made"] },
			{ status: 400 },
		);
	}

	if (scope === "made")
	{
		return Response.json({
			ok: true,
			scope,
			views: listVisitHistory(session.user.id).map((row) => ({
				...serializeUserSummary(row),
				viewed_at: row.viewed_at,
			})),
		});
	}

	return Response.json({
		ok: true,
		scope,
		views: listViewers(session.user.id).map((row) => ({
			...serializeUserSummary(row),
			viewed_at: row.viewed_at,
			visit_count: row.visit_count,
		})),
	});
}
