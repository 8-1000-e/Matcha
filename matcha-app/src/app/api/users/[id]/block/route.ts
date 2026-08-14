import { block, unblock } from "@/lib/db";
import { requireModerationTarget } from "@/lib/profile/target";

interface Context {
	params: Promise<{ id: string }>;
}

export async function PUT(_request: Request, context: Context)
{
	const { id } = await context.params;
	const guarded = await requireModerationTarget(
		id,
		"you cannot block yourself",
	);
	if (!guarded.ok)
	{
		return guarded.response;
	}

	return Response.json({ ok: true, created: block(guarded.viewer.id, id) });
}

export async function DELETE(_request: Request, context: Context)
{
	const { id } = await context.params;
	const guarded = await requireModerationTarget(
		id,
		"you cannot unblock yourself",
	);
	if (!guarded.ok)
	{
		return guarded.response;
	}

	return Response.json({ ok: true, removed: unblock(guarded.viewer.id, id) });
}
