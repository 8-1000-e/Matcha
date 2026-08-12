import { hashPassword } from "@/lib/auth/password";
import { validateRegister } from "@/lib/auth/validation";
import { createUser, isEmailTaken, isUsernameTaken } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(request: Request)
{
    let body: unknown;
    try {
        body = await request.json();
    }
    catch {
        return Response.json({ errors: ["invalid json body"] }, { status: 400 });
    }

    const result = validateRegister(body);
    if (!result.ok)
        return Response.json({errors: result.errors}, { status: 400 });

    if (isEmailTaken(result.value.email))
        return Response.json({ errors: ["email is already taken"] }, { status: 409 });
    if (isUsernameTaken(result.value.username))
        return Response.json({ errors: ["username is already taken"] }, { status: 409 });

    const passwordHash = await hashPassword(result.value.password);

    const user = createUser({
        email: result.value.email,
        username: result.value.username,
        first_name: result.value.first_name,
        last_name: result.value.last_name,
        birth_date: result.value.birth_date,
        password_hash: passwordHash,
    });

    return Response.json(
        { id: user.id, username: user.username },
        { status: 201 },
    );
}
