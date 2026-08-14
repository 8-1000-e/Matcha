import { recordView } from "@/lib/db";
import { emitViewed } from "@/lib/notifications/emit";
import { requireTarget } from "@/lib/profile/target";

interface Context {
	params: Promise<{ id: string }>;
}

export async function POST(_request: Request, context: Context)
{
	const { id } = await context.params;
	const guarded = await requireTarget(id, {
		selfError: "you cannot view yourself",
	});
	if (!guarded.ok)
	{
		return guarded.response;
	}

	recordView(guarded.viewer.id, id);
	emitViewed(id, guarded.viewer.id);

	return Response.json({ ok: true });
}
