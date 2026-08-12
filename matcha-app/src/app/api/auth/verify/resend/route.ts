import { createEmailToken, EMAIL_TTL } from "@/lib/auth/tokens";
import { findUserByEmail, issueEmailToken, revokeEmailTokens } from "@/lib/db";
import { readJsonBody } from "@/lib/http/body";
import { sendMail } from "@/lib/mail/mailer";

export const runtime = "nodejs";

const SENT = { ok: true, message: "if the address exists, a link has been sent" };

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

	const { email } = body.value as Record<string, unknown>;
	if (typeof email !== "string" || email.length === 0)
	{
		return Response.json({ errors: ["email is required"] }, { status: 400 });
	}

	const user = findUserByEmail(email.trim().toLowerCase());

	if (!user || user.is_verified === 1)
	{
		return Response.json(SENT);
	}

	revokeEmailTokens(user.id, "email_verification");

	const verification = createEmailToken();
	issueEmailToken({
		user_id: user.id,
		token_hash: verification.hash,
		type: "email_verification",
		expires_at: verification.expiresAt,
	});

	const link = `${process.env.APP_URL}/api/auth/verify?token=${verification.token}`;
	await sendMail(
		user.email,
		"Verify your address — Matcha",
		`<p>Welcome ${user.username},</p>
		 <p><a href="${link}">Verify your address</a></p>
		 <p>This link expires in ${Math.round(EMAIL_TTL / 60)} minutes.</p>`,
	);

	return Response.json(SENT);
}
