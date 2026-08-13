import { after } from "next/server";
import { createEmailToken, EMAIL_TTL } from "@/lib/auth/tokens";
import { findUserByEmail, issueEmailToken, revokeEmailTokens } from "@/lib/db";
import { readJsonBody } from "@/lib/http/body";
import { sendMail } from "@/lib/mail/mailer";
import { resendVerifyMail } from "@/lib/mail/templates";

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

	// Emission du jeton et envoi SMTP apres la reponse : sinon l'adresse a
	// verifier repond en centaines de ms la ou l'adresse inconnue (ou deja
	// verifiee) repond tout de suite, et ce delai suffit a enumerer les
	// comptes. Un echec d'envoi est journalise, jamais reporte au client.
	if (user && user.is_verified !== 1)
	{
		after(async () => {
			revokeEmailTokens(user.id, "email_verification");

			const verification = createEmailToken();
			issueEmailToken({
				user_id: user.id,
				token_hash: verification.hash,
				type: "email_verification",
				expires_at: verification.expiresAt,
			});

			const link = `${process.env.APP_URL}/api/auth/verify?token=${verification.token}`;
			const mail = resendVerifyMail({ username: user.username, link, ttlSeconds: EMAIL_TTL });
			if (!await sendMail(user.email, mail.subject, mail.html, mail.text))
			{
				console.error("verification mail not delivered", { user_id: user.id });
			}
		});
	}

	return Response.json(SENT);
}
