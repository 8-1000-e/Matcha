import { after } from "next/server";
import { createEmailToken, EMAIL_TTL } from "@/lib/auth/tokens";
import { findUserByEmail, issueEmailToken, revokeEmailTokens } from "@/lib/db";
import { readJsonBody } from "@/lib/http/body";
import { EMAIL_RULE, rateLimited } from "@/lib/http/rateLimit";
import { sendMail } from "@/lib/mail/mailer";
import { resetPasswordMail } from "@/lib/mail/templates";

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

	const limited = rateLimited(request, EMAIL_RULE, email.trim().toLowerCase());
	if (limited !== null)
	{
		return limited;
	}

	const user = findUserByEmail(email.trim().toLowerCase());
	if (user)
	{
		after(async () => {
			revokeEmailTokens(user.id, "password_reset");
			const verification = createEmailToken();
			issueEmailToken({
				user_id: user.id,
				token_hash: verification.hash,
				type: "password_reset",
				expires_at: verification.expiresAt,
			});

			const link = `${process.env.APP_URL}/reset-password?token=${verification.token}`;
			const mail = resetPasswordMail({ username: user.username, link, ttlSeconds: EMAIL_TTL });
			if (!await sendMail(user.email, mail.subject, mail.html, mail.text))
			{
				console.error("password reset mail not delivered", { user_id: user.id });
			}
		});
	}

	return Response.json(SENT);
}