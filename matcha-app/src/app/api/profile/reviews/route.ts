import { requireSession } from "@/lib/auth/guards";
import { findPopularity, listVisibleReviews } from "@/lib/db";

export async function GET()
{
	const session = await requireSession();
	if (!session.ok)
	{
		return session.response;
	}

	const popularity = findPopularity(session.user.id);
	const reviews = listVisibleReviews(session.user.id).map((review) => ({
		id: review.id,
		author_id: review.author_id,
		author_username: review.author_username,
		score: review.score,
		body: review.body,
		created_at: review.created_at,
		updated_at: review.updated_at,
	}));

	return Response.json({
		ok: true,
		review_average: popularity?.review_average ?? 0,
		review_count: popularity?.review_count ?? 0,
		reviews,
	});
}
