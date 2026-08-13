import { clearAuthCookies } from "@/lib/auth/session";

export async function POST()
{
	await clearAuthCookies();
	return Response.json({ ok: true });
}
