import { requireSession } from "@/lib/auth/guards";
import {
	DatabaseError,
	findFeedSession,
	listTags,
	openFeedSession,
	purgeIfDue,
	readFeedPage,
} from "@/lib/db";
import { filtersHash, validateDiscoveryQuery } from "@/lib/discovery/query";

export async function GET(request: Request)
{
	const session = await requireSession();
	if (!session.ok)
	{
		return session.response;
	}

	const result = validateDiscoveryQuery(new URL(request.url).searchParams);
	if (!result.ok)
	{
		return Response.json({ errors: result.errors }, { status: 400 });
	}

	const query = result.value;
	const unknown = unknownTags(query.filters.tagIds);
	if (unknown.length > 0)
	{
		return Response.json(
			{ errors: [`unknown tags: ${unknown.join(", ")}`] },
			{ status: 400 },
		);
	}

	purgeIfDue();

	const viewer = session.user;
	const hash = filtersHash(query);
	const options = { filters: query.filters, sort: query.sort };

	try
	{
		const existing = query.sessionId === null
			? null
			: findFeedSession(viewer, query.sessionId, hash);
		const feed = existing ?? openFeedSession(viewer, hash, options);
		const page = readFeedPage(viewer, feed, query.after, query.limit, options);

		return Response.json({
			session: page.session.id,
			reset: existing === null,
			items: page.items,
			next: page.next,
			total: page.session.total,
		});
	}
	catch (error)
	{
		if (error instanceof DatabaseError && error.message === "profile_incomplete")
		{
			return Response.json({ errors: ["profile_incomplete"] }, { status: 403 });
		}
		throw error;
	}
}

function unknownTags(tagIds: readonly number[] | undefined): number[]
{
	if (tagIds === undefined || tagIds.length === 0)
	{
		return [];
	}
	const known = new Set(listTags().map((tag) => tag.id));
	return tagIds.filter((id) => !known.has(id));
}
