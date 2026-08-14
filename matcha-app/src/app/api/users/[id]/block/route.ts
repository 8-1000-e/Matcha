import { block, findMatchBetween, unblock } from "@/lib/db";
import { requireModerationTarget } from "@/lib/profile/target";
import { closeConversation } from "@/lib/realtime/conversation";

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

	const existing = findMatchBetween(guarded.viewer.id, id);
	const created = block(guarded.viewer.id, id);
	if (created && existing?.is_active === 1)
	{
		closeConversation(existing.id);
	}

	return Response.json({ ok: true, created });
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
