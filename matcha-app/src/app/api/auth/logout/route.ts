import { clearAuthCookies } from "@/lib/auth/session";

export const runtime = "nodejs";

export async function POST()
{
	await clearAuthCookies();
	return Response.json({ ok: true });
}
