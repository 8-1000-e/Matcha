import { requireSession } from "@/lib/auth/guards";
import { countLiked, countLikers, listLiked, listLikers } from "@/lib/db";
import { paginate, validatePage } from "@/lib/http/pagination";
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

	const parameters = new URL(request.url).searchParams;
	const scope = parameters.get("scope") ?? "received";
	if (!isScope(scope))
	{
		return Response.json(
			{ errors: ["scope must be received or sent"] },
			{ status: 400 },
		);
	}

	const requested = validatePage(parameters.get("page"));
	if (!requested.ok)
	{
		return Response.json({ errors: requested.errors }, { status: 400 });
	}

	const viewer = session.user.id;
	const total = scope === "sent" ? countLiked(viewer) : countLikers(viewer);
	const page = paginate(requested.value, total);
	if (page === null)
	{
		return Response.json({ errors: ["page is out of range"] }, { status: 400 });
	}

	const rows
		= scope === "sent"
			? listLiked(viewer, page)
			: listLikers(viewer, page);

	const likers = rows.map((row) => ({
		...serializeUserSummary(row),
		liked_at: row.liked_at,
	}));

	return Response.json({
		ok: true,
		scope,
		likers,
		page: page.page,
		pages: page.pages,
		total: page.total,
	});
}
