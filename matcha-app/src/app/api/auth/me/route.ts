import { requireUser } from "@/lib/auth/session";

export const runtime = "nodejs";

export async function GET()
{
	const user = await requireUser();
	if (!user)
	{
		return Response.json({ errors: ["unauthorized"] }, { status: 401 });
	}
	return Response.json({ok: true, user: { id: user.id, username: user.username }});
}
