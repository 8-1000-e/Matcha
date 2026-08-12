import { cookies } from "next/headers";
import { setAuthCookies } from "@/lib/auth/session";
import { hashToken } from "@/lib/auth/tokens";
import { findUsableRefreshToken, revokeRefreshToken, users } from "@/lib/db";

export const runtime = "nodejs";

export async function POST()
{
	const cookie = (await cookies()).get("refresh")?.value;
	if (!cookie)
	{
		return Response.json({ errors: ["refresh token is required"] }, { status: 401 });
	}

	const tokenFound = findUsableRefreshToken(hashToken(cookie));
	if (!tokenFound)
	{
		return Response.json({ errors: ["refresh token is required"] }, { status: 401 });
	}

	const user = users.findById(tokenFound.user_id);
	if (!user)
	{
		return Response.json({ errors: ["unauthorized"] }, { status: 401 });
	}

	revokeRefreshToken(tokenFound.token_hash);
	await setAuthCookies(user.id);

	return Response.json({ ok: true });
}
