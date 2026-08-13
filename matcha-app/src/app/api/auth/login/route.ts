import { verifyPassword } from "@/lib/auth/password";
import { setAuthCookies } from "@/lib/auth/session";
import { findUserByUsername, purgeIfDue } from "@/lib/db";
import { readJsonBody } from "@/lib/http/body";

export async function POST(request: Request)
{
	purgeIfDue();

	const body = await readJsonBody(request);
	if (!body.ok)
	{
		return body.response;
	}

	if (typeof body.value !== "object" || body.value === null || Array.isArray(body.value))
	{
		return Response.json({ errors: ["invalid request body"] }, { status: 400 });
	}

	const { username: rawUsername, password } = body.value as Record<string, unknown>;
	if (typeof rawUsername !== "string" || typeof password !== "string")
	{
		return Response.json({ errors: ["username and password are required"] }, { status: 400 });
	}

	const username = rawUsername.trim();

	const user = findUserByUsername(username);
	if (!user || !(await verifyPassword(password, user.password_hash)))
	{
		return Response.json({ errors: ["invalid username or password"] }, { status: 401 });
	}

	await setAuthCookies(user.id);
	return Response.json({
		ok: true,
		user: {
			id: user.id,
			username: user.username,
			is_verified: user.is_verified === 1,
		},
	});

}
