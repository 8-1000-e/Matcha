import { report } from "@/lib/db";
import { readJsonBody } from "@/lib/http/body";
import { validateReportReason } from "@/lib/moderation/validation";
import { requireModerationTarget } from "@/lib/profile/target";

interface Context {
	params: Promise<{ id: string }>;
}

export async function POST(request: Request, context: Context)
{
	const { id } = await context.params;
	const guarded = await requireModerationTarget(
		id,
		"you cannot report yourself",
	);
	if (!guarded.ok)
	{
		return guarded.response;
	}

	const body = await readJsonBody(request);
	if (!body.ok)
	{
		return body.response;
	}

	const result = validateReportReason(body.value);
	if (!result.ok)
	{
		return Response.json({ errors: result.errors }, { status: 400 });
	}

	const filed = report({
		reporter_id: guarded.viewer.id,
		reported_id: id,
		reason: result.value,
	});
	if (filed === undefined)
	{
		return Response.json({ errors: ["report failed"] }, { status: 500 });
	}

	return Response.json({ ok: true, reason: filed.reason });
}
