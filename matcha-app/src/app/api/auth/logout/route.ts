import { clearAuthCookies, requireUser } from "@/lib/auth/session";

export const runtime = "nodejs";

export async function POST()
{
	const user = await requireUser();
	if (!user)
	{
		return Response.json({ errors: ["unauthorized"] }, { status: 401 });
	}
	await clearAuthCookies();
	return Response.json({ ok: true });
}
