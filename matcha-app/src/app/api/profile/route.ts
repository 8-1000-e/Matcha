import { requireAnySession, requireSession } from "@/lib/auth/guards";
import { verifyPassword } from "@/lib/auth/password";
import { createEmailToken, EMAIL_TTL } from "@/lib/auth/tokens";
import {
	DELETION_GRACE_DAYS,
	isEmailTaken,
	issueEmailToken,
	markUserDeleted,
	purgeDate,
	revokeEmailTokens,
	users,
	type UserInsert,
} from "@/lib/db";
import { readJsonBody } from "@/lib/http/body";
import { sendMail } from "@/lib/mail/mailer";
import { buildProfile, refreshedProfile } from "@/lib/profile/profile";
import { isRecord, validateProfilePatch } from "@/lib/profile/validation";

async function sendVerification(
	userId: string,
	username: string,
	email: string,
): Promise<void>
{
	revokeEmailTokens(userId, "email_verification");

	const verification = createEmailToken();
	issueEmailToken({
		user_id: userId,
		token_hash: verification.hash,
		type: "email_verification",
		expires_at: verification.expiresAt,
	});

	const link = `${process.env.APP_URL}/api/auth/verify?token=${verification.token}`;
	await sendMail(
		email,
		"Confirm your new address - Matcha",
		`<p>Hello ${username},</p>
		 <p><a href="${link}">Confirm your new address</a></p>
		 <p>This link expires in ${Math.round(EMAIL_TTL / 60)} minutes.</p>`,
	);
}
export async function GET()
{
	const session = await requireAnySession();
	if (!session.ok)
	{
		return session.response;
	}

	return Response.json({ ok: true, profile: buildProfile(session.user) });
}

export async function PATCH(request: Request)
{
	const session = await requireSession();
	if (!session.ok)
	{
		return session.response;
	}

	const body = await readJsonBody(request);
	if (!body.ok)
	{
		return body.response;
	}

	const result = validateProfilePatch(body.value);
	if (!result.ok)
	{
		return Response.json({ errors: result.errors }, { status: 400 });
	}

	const { user } = session;
	const patch = result.value;
	const email = patch.email !== undefined && patch.email !== user.email
		? patch.email
		: undefined;

	if (email !== undefined && isEmailTaken(email, user.id))
	{
		return Response.json({ errors: ["email is already in use"] }, { status: 409 });
	}

	const changes: Partial<UserInsert> = {
		first_name: patch.first_name,
		last_name: patch.last_name,
		gender: patch.gender,
		orientation: patch.orientation,
		biography: patch.biography,
		email,
		is_verified: email === undefined ? undefined : 0,
	};

	const updated = Object.values(changes).some((value) => value !== undefined)
		? users.updateById(user.id, changes)
		: user;

	if (!updated)
	{
		return Response.json({ errors: ["unauthorized"] }, { status: 401 });
	}

	if (email !== undefined)
	{
		await sendVerification(updated.id, updated.username, email);
	}

	const profile = refreshedProfile(updated.id);
	if (!profile)
	{
		return Response.json({ errors: ["unauthorized"] }, { status: 401 });
	}

	return Response.json({
		ok: true,
		email_verification_sent: email !== undefined,
		profile,
	});
}
export async function DELETE(request: Request)
{
	const session = await requireAnySession();
	if (!session.ok)
	{
		return session.response;
	}

	if (session.user.deleted_at !== null)
	{
		return Response.json(
			{ errors: ["account_deleted"], purge_at: purgeDate(session.user.deleted_at) },
			{ status: 409 },
		);
	}

	const body = await readJsonBody(request);
	if (!body.ok)
	{
		return body.response;
	}

	const password = isRecord(body.value) ? body.value.password : undefined;
	if (typeof password !== "string" || password.length === 0)
	{
		return Response.json({ errors: ["password is required"] }, { status: 400 });
	}

	if (!(await verifyPassword(password, session.user.password_hash)))
	{
		return Response.json({ errors: ["invalid password"] }, { status: 403 });
	}

	const deletedAt = markUserDeleted(session.user.id);
	if (deletedAt === null)
	{
		return Response.json({ errors: ["unauthorized"] }, { status: 401 });
	}

	return Response.json({
		ok: true,
		deleted_at: deletedAt,
		purge_at: purgeDate(deletedAt),
		grace_days: DELETION_GRACE_DAYS,
	});
}
