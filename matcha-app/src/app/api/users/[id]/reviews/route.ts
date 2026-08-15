import { listVisibleReviews } from "@/lib/db";
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

	const reviews = listVisibleReviews(id).map((review) => ({
		id: review.id,
		author_id: review.author_id,
		author_username: review.author_username,
		score: review.score,
		body: review.body,
		created_at: review.created_at,
		updated_at: review.updated_at,
	}));

	return Response.json({ ok: true, reviews });
}
