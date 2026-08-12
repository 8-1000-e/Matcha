import { hashPassword } from "@/lib/auth/password";
import { checkPassWord } from "@/lib/auth/passwordPolicy";
import { hashToken } from "@/lib/auth/tokens";
import { PASSWORD_MESSAGES } from "@/lib/auth/validation";
import {
	consumeEmailToken,
	findUsableEmailToken,
	revokeAllRefreshTokens,
	updatePassword,
} from "@/lib/db";
import { readJsonBody } from "@/lib/http/body";

export const runtime = "nodejs";

export async function POST(request: Request)
{
	const body = await readJsonBody(request);
	if (!body.ok)
	{
		return body.response;
	}
	if (typeof body.value !== "object" || body.value === null || Array.isArray(body.value))
	{
		return Response.json({ errors: ["invalid request body"] }, { status: 400 });
	}

	const { token, password } = body.value as Record<string, unknown>;
	if (typeof token !== "string" || token.length === 0
		|| typeof password !== "string" || password.length === 0)
	{
		return Response.json({ errors: ["token and password are required"] }, { status: 400 });
	}

	const tokenFound = findUsableEmailToken(hashToken(token), "password_reset");
	if (!tokenFound)
	{
		return Response.json({ errors: ["invalid or expired token"] }, { status: 400 });
	}

	const passwordError = checkPassWord(password);
	if (passwordError)
	{
		return Response.json({ errors: [PASSWORD_MESSAGES[passwordError]] }, { status: 400 });
	}

	if (!consumeEmailToken(tokenFound.id))
	{
		return Response.json({ errors: ["invalid or expired token"] }, { status: 400 });
	}

	updatePassword(tokenFound.user_id, await hashPassword(password));

	revokeAllRefreshTokens(tokenFound.user_id);

	return Response.json({ ok: true });
}
