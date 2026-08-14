import { requireSession } from "@/lib/auth/guards";
import { markNotificationRead } from "@/lib/db";
import { readJsonBody } from "@/lib/http/body";
import { validateRead } from "@/lib/notifications/validation";

interface Context {
	params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, context: Context)
{
	const session = await requireSession();
	if (!session.ok)
	{
		return session.response;
	}

	const body = await readJsonBody(request);
	if (!body.ok)
	{
		return body.response;
	}

	const result = validateRead(body.value);
	if (!result.ok)
	{
		return Response.json({ errors: result.errors }, { status: 400 });
	}

	const { id } = await context.params;
	if (!markNotificationRead(session.user.id, id))
	{
		return Response.json(
			{ errors: ["notification not found"] },
			{ status: 404 },
		);
	}

	return Response.json({ ok: true });
}
