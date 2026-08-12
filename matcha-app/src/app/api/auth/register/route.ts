import { hashPassword } from "@/lib/auth/password";
import { validateRegister } from "@/lib/auth/validation";
import { ConstraintError, createUser, isEmailTaken, isUsernameTaken } from "@/lib/db";

export const runtime = "nodejs";

const TAKEN = "email or username is already in use";

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
	{
		return Response.json({ errors: result.errors }, { status: 400 });
	}

	if (isEmailTaken(result.value.email) || isUsernameTaken(result.value.username))
	{
		return Response.json({ errors: [TAKEN] }, { status: 409 });
	}

	const passwordHash = await hashPassword(result.value.password);

	let user;
	try {
		user = createUser({
			email: result.value.email,
			username: result.value.username,
			first_name: result.value.first_name,
			last_name: result.value.last_name,
			birth_date: result.value.birth_date,
			password_hash: passwordHash,
		});
	}
	catch (error) {
		if (error instanceof ConstraintError)
		{
			return Response.json({ errors: [TAKEN] }, { status: 409 });
		}
		throw error;
	}

	return Response.json(
		{ id: user.id, username: user.username },
		{ status: 201 },
	);
}
