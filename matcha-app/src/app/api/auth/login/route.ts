import { verifyPassword } from "@/lib/auth/password";
import { setAuthCookies } from "@/lib/auth/session";
import { findUserByUsername } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(request: Request)
{
	let raw: string;
	try {
		raw = await request.text();
	}
	catch {
		return Response.json({ errors: ["invalid request body"] }, { status: 400 });
	}

    let username: string;
    let password: string;
    try {
        const body = JSON.parse(raw);
        if (typeof body.username !== "string" || typeof body.password !== "string")
        {
            return Response.json({ errors: ["username and password are required"] }, { status: 400 });
        }
        username = body.username.trim();
        password = body.password;
    }
    catch {
        return Response.json({ errors: ["invalid json body"] }, { status: 400 });
    }

    const user = findUserByUsername(username);
    if (!user || !(await verifyPassword(password, user.password_hash)))
        return Response.json({ errors: ["invalid username or password"] }, { status: 401 });
    await setAuthCookies(user.id);
    return Response.json({ ok: true, user: { id: user.id, username: user.username } });

}
