import { requireAnySession } from "@/lib/auth/guards";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { checkPassWord } from "@/lib/auth/passwordPolicy";
import { setAuthCookies } from "@/lib/auth/session";
import { PASSWORD_MESSAGES } from "@/lib/auth/validation";
import { revokeAllRefreshTokens, updatePassword } from "@/lib/db";
import { readJsonBody } from "@/lib/http/body";
import { isRecord } from "@/lib/profile/validation";

export async function PATCH(request: Request)
{
	const session = await requireAnySession();
	if (!session.ok)
	{
		return session.response;
	}

	const body = await readJsonBody(request);
	if (!body.ok)
	{
		return body.response;
	}
	if (!isRecord(body.value))
	{
		return Response.json({ errors: ["invalid request body"] }, { status: 400 });
	}

	const { current, password } = body.value;
	if (typeof current !== "string" || current.length === 0
		|| typeof password !== "string" || password.length === 0)
	{
		return Response.json(
			{ errors: ["current and new passwords are required"] },
			{ status: 400 },
		);
	}

	if (!(await verifyPassword(current, session.user.password_hash)))
	{
		return Response.json({ errors: ["invalid password"] }, { status: 403 });
	}

	if (current === password)
	{
		return Response.json(
			{ errors: ["new password must differ from the current one"] },
			{ status: 400 },
		);
	}

	const passwordError = checkPassWord(password);
	if (passwordError)
	{
		return Response.json(
			{ errors: [PASSWORD_MESSAGES[passwordError]] },
			{ status: 400 },
		);
	}

	updatePassword(session.user.id, await hashPassword(password));
	revokeAllRefreshTokens(session.user.id);
	await setAuthCookies(session.user.id);

	return Response.json({ ok: true });
}
