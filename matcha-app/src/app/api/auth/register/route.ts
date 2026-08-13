import { hashPassword } from "@/lib/auth/password";
import { createEmailToken, EMAIL_TTL } from "@/lib/auth/tokens";
import { validateRegister } from "@/lib/auth/validation";
import { ConstraintError, createUser, isEmailTaken, issueEmailToken, isUsernameTaken } from "@/lib/db";
import { readJsonBody } from "@/lib/http/body";
import { sendMail } from "@/lib/mail/mailer";

const TAKEN = "email or username is already in use";

export async function POST(request: Request)
{
	const body = await readJsonBody(request);
	if (!body.ok)
	{
		return body.response;
	}

	const result = validateRegister(body.value);
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


	const verification = createEmailToken();
	issueEmailToken({
		user_id: user.id,
		token_hash: verification.hash,
		type: "email_verification",
		expires_at: verification.expiresAt,
	});

	const link = `${process.env.APP_URL}/api/auth/verify?token=${verification.token}`;
	await sendMail(
		result.value.email,
		"Verify your address - BrewMance",
		`<p>Welcome ${user.username},</p>
		 <p><a href="${link}">Verify your address</a></p>
		 <p>This link expires in ${Math.round(EMAIL_TTL / 60)} minutes.</p>`,
	);

	return Response.json(
		{ id: user.id, username: user.username },
		{ status: 201 },
	);
}
