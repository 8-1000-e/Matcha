import {
	canReview,
	ConstraintError,
	DatabaseError,
	listVisibleReviews,
	removeReview,
	upsertReview,
} from "@/lib/db";
import { readJsonBody } from "@/lib/http/body";
import { requireTarget } from "@/lib/profile/target";
import { validateReview } from "@/lib/reviews/validation";

interface Context {
	params: Promise<{ id: string }>;
}

const SELF_ERROR = "use /api/profile for your own profile";

export async function GET(_request: Request, context: Context)
{
	const { id } = await context.params;
	const guarded = await requireTarget(id, { selfError: SELF_ERROR });
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

export async function PUT(request: Request, context: Context)
{
	const { id } = await context.params;
	const guarded = await requireTarget(id, { selfError: SELF_ERROR });
	if (!guarded.ok)
	{
		return guarded.response;
	}

	if (!canReview(guarded.viewer.id, id))
	{
		return Response.json(
			{ errors: ["review_requires_conversation"] },
			{ status: 403 },
		);
	}

	const body = await readJsonBody(request);
	if (!body.ok)
	{
		return body.response;
	}

	const result = validateReview(body.value);
	if (!result.ok)
	{
		return Response.json({ errors: result.errors }, { status: 400 });
	}

	try
	{
		const review = upsertReview({
			author_id: guarded.viewer.id,
			target_id: id,
			score: result.value.score,
			body: result.value.body,
		});

		return Response.json({
			ok: true,
			review: {
				id: review.id,
				author_id: review.author_id,
				author_username: guarded.viewer.username,
				score: review.score,
				body: review.body,
				created_at: review.created_at,
				updated_at: review.updated_at,
			},
		});
	}
	catch (error)
	{
		if (
			error instanceof ConstraintError
			|| (error instanceof DatabaseError
				&& error.message === "review_requires_match")
		)
		{
			return Response.json(
				{ errors: ["review_requires_conversation"] },
				{ status: 403 },
			);
		}
		throw error;
	}
}

export async function DELETE(_request: Request, context: Context)
{
	const { id } = await context.params;
	const guarded = await requireTarget(id, { selfError: SELF_ERROR });
	if (!guarded.ok)
	{
		return guarded.response;
	}

	if (!removeReview(guarded.viewer.id, id))
	{
		return Response.json({ errors: ["review not found"] }, { status: 404 });
	}

	return Response.json({ ok: true, removed: true });
}
