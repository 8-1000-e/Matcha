import { requireSession } from "@/lib/auth/guards";
import { readBody } from "@/lib/messages/messages";
import { buildExport } from "@/lib/profile/export";

export async function GET()
{
	const session = await requireSession();
	if (!session.ok)
	{
		return session.response;
	}

	const payload = buildExport(session.user.id, readBody);
	if (payload === null)
	{
		return Response.json({ errors: ["user not found"] }, { status: 404 });
	}

	const stamp = payload.exported_at.slice(0, 10);

	return new Response(JSON.stringify(payload, null, 2), {
		headers: {
			"content-type": "application/json; charset=utf-8",
			"content-disposition": `attachment; filename="matcha-${payload.account.username}-${stamp}.json"`,
			"cache-control": "no-store",
		},
	});
}
