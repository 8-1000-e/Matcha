import { like, unlike } from "@/lib/db";
import { emitLiked, emitMatch, emitUnliked } from "@/lib/notifications/emit";
import { requireTarget } from "@/lib/profile/target";

interface Context {
	params: Promise<{ id: string }>;
}

export async function PUT(_request: Request, context: Context)
{
	const { id } = await context.params;
	const guarded = await requireTarget(id, {
		selfError: "you cannot like yourself",
		requireProfilePhoto: true,
	});
	if (!guarded.ok)
	{
		return guarded.response;
	}

	const outcome = like(guarded.viewer.id, id);
	if (outcome.liked && outcome.matched)
	{
		emitMatch(id, guarded.viewer.id);
	}
	else if (outcome.liked)
	{
		emitLiked(id, guarded.viewer.id);
	}

	return Response.json({
		ok: true,
		liked: outcome.liked,
		matched: outcome.matched,
		match_id: outcome.matched ? (outcome.match?.id ?? null) : null,
	});
}

export async function DELETE(_request: Request, context: Context)
{
	const { id } = await context.params;
	const guarded = await requireTarget(id, {
		selfError: "you cannot unlike yourself",
	});
	if (!guarded.ok)
	{
		return guarded.response;
	}

	const outcome = unlike(guarded.viewer.id, id);
	if (outcome.disconnected)
	{
		emitUnliked(id, guarded.viewer.id);
	}

	return Response.json({
		ok: true,
		unliked: outcome.unliked,
		disconnected: outcome.disconnected,
	});
}
