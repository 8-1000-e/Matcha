import { requireSession } from "@/lib/auth/guards";
import {
	countViewers,
	countVisitHistory,
	listViewers,
	listVisitHistory,
} from "@/lib/db";
import { paginate, validatePage } from "@/lib/http/pagination";
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

	const parameters = new URL(request.url).searchParams;
	const scope = parameters.get("scope") ?? "received";
	if (!isScope(scope))
	{
		return Response.json(
			{ errors: ["scope must be received or made"] },
			{ status: 400 },
		);
	}

	const requested = validatePage(parameters.get("page"));
	if (!requested.ok)
	{
		return Response.json({ errors: requested.errors }, { status: 400 });
	}

	const viewer = session.user.id;
	const total = scope === "made" ? countVisitHistory(viewer) : countViewers(viewer);
	const page = paginate(requested.value, total);
	if (page === null)
	{
		return Response.json({ errors: ["page is out of range"] }, { status: 400 });
	}

	const views
		= scope === "made"
			? listVisitHistory(viewer, page).map((row) => ({
				...serializeUserSummary(row),
				viewed_at: row.viewed_at,
			}))
			: listViewers(viewer, page).map((row) => ({
				...serializeUserSummary(row),
				viewed_at: row.viewed_at,
				visit_count: row.visit_count,
			}));

	return Response.json({
		ok: true,
		scope,
		views,
		page: page.page,
		pages: page.pages,
		total: page.total,
	});
}
