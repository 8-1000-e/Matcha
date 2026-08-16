import { cookies } from "next/headers";
import { hashPassword } from "@/lib/auth/password";
import { setAuthCookies } from "@/lib/auth/session";
import { createRandomSecret } from "@/lib/auth/tokens";
import { validateOauthSignup } from "@/lib/auth/validation";
import {
	ConstraintError,
	createUser,
	isEmailTaken,
	isUsernameTaken,
	linkOAuthAccount,
} from "@/lib/db";
import { readJsonBody } from "@/lib/http/body";
import { importAvatar } from "@/lib/oauth/avatar";
import { OAUTH_DRAFT_COOKIE, openOauthDraft } from "@/lib/oauth/draft";
import { isOAuthProvider } from "@/lib/oauth/providers";

export async function POST(request: Request)
{
	const store = await cookies();
	const draft = openOauthDraft(store.get(OAUTH_DRAFT_COOKIE)?.value);
	if (draft === null || !isOAuthProvider(draft.provider))
	{
		return Response.json({ errors: ["oauth_draft_expired"] }, { status: 400 });
	}

	const body = await readJsonBody(request);
	if (!body.ok)
	{
		return body.response;
	}

	const result = validateOauthSignup(body.value);
	if (!result.ok)
	{
		return Response.json({ errors: result.errors }, { status: 400 });
	}

	if (isEmailTaken(draft.email) || isUsernameTaken(result.value.username))
	{
		return Response.json(
			{ errors: ["email or username is already in use"] },
			{ status: 409 },
		);
	}

	const passwordHash = await hashPassword(createRandomSecret());

	let user;
	try
	{
		user = createUser({
			email: draft.email,
			username: result.value.username,
			first_name: result.value.first_name,
			last_name: result.value.last_name,
			birth_date: result.value.birth_date,
			password_hash: passwordHash,
			has_password: 0,
			is_verified: 1,
		});
	}
	catch (error)
	{
		if (error instanceof ConstraintError)
		{
			return Response.json(
				{ errors: ["email or username is already in use"] },
				{ status: 409 },
			);
		}
		throw error;
	}

	try
	{
		linkOAuthAccount({
			provider: draft.provider,
			provider_user_id: draft.provider_user_id,
			user_id: user.id,
			email: draft.email,
		});
	}
	catch (error)
	{
		if (error instanceof ConstraintError)
		{
			return Response.json({ errors: ["already_linked"] }, { status: 409 });
		}
		throw error;
	}

	await importAvatar(user.id, draft.avatar_url);

	store.set(OAUTH_DRAFT_COOKIE, "", { path: "/", maxAge: 0 });
	await setAuthCookies(user.id);

	return Response.json(
		{ id: user.id, username: user.username, is_verified: true },
		{ status: 201 },
	);
}
