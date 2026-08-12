import { createEmailToken, EMAIL_TTL } from "@/lib/auth/tokens";
import { findUserByEmail, issueEmailToken, revokeEmailTokens } from "@/lib/db";
import { sendMail } from "@/lib/mail/mailer";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 8 * 1024;

const SENT = { ok: true, message: "if the address exists, a link has been sent" };

export async function POST(request: Request)
{
	const declared = Number(request.headers.get("content-length") ?? 0);
	if (declared > MAX_BODY_BYTES)
	{
		return Response.json({ errors: ["request body is too large"] }, { status: 413 });
	}

	let raw: string;
	try
	{
		raw = await request.text();
	}
	catch
	{
		return Response.json({ errors: ["invalid request body"] }, { status: 400 });
	}

	if (Buffer.byteLength(raw, "utf8") > MAX_BODY_BYTES)
	{
		return Response.json({ errors: ["request body is too large"] }, { status: 413 });
	}

	let body: unknown;
	try
	{
		body = JSON.parse(raw);
	}
	catch
	{
		return Response.json({ errors: ["invalid json body"] }, { status: 400 });
	}

	if (typeof body !== "object" || body === null || Array.isArray(body))
	{
		return Response.json({ errors: ["invalid request body"] }, { status: 400 });
	}

	const { email } = body as Record<string, unknown>;
	if (typeof email !== "string" || email.length === 0)
	{
		return Response.json({ errors: ["email is required"] }, { status: 400 });
	}

	const user = findUserByEmail(email.trim().toLowerCase());

	// Compte inconnu ou deja verifie : on ne fait rien, mais on repond
	// comme si tout s'etait bien passe.
	if (!user || user.is_verified === 1)
	{
		return Response.json(SENT);
	}

	// Les liens precedents sont invalides : un seul lien vivant a la fois,
	// sinon chaque demande laisse un jeton de plus utilisable.
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
