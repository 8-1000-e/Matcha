import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getSession, setAuthCookies } from "@/lib/auth/session";
import {
	ConstraintError,
	findOAuthAccount,
	findUserByEmail,
	linkOAuthAccount,
	users,
} from "@/lib/db";
import type { OAuthProvider } from "@/lib/db/types";
import {
	OAUTH_DRAFT_COOKIE,
	OAUTH_DRAFT_TTL_SECONDS,
	sealOauthDraft,
} from "@/lib/oauth/draft";
import { exchangeCode, fetchOAuthProfile, suggestUsername } from "@/lib/oauth/flow";
import { isOAuthProvider, providerConfig } from "@/lib/oauth/providers";
import { consumeState, sameState } from "@/lib/oauth/state";

interface Context {
	params: Promise<{ provider: string }>;
}

const NAMES: Record<OAuthProvider, string> = { "42": "Intra 42", google: "Google" };

function back(request: Request, path: string, error?: string): NextResponse
{
	const url = new URL(path, new URL(request.url).origin);
	if (error !== undefined)
	{
		url.searchParams.set("oauth", error);
	}

	return NextResponse.redirect(url);
}

export async function GET(request: Request, context: Context)
{
	const { provider } = await context.params;
	if (!isOAuthProvider(provider))
	{
		return Response.json({ errors: ["not found"] }, { status: 404 });
	}

	const config = providerConfig(provider);
	if (!config)
	{
		return Response.json({ errors: ["provider not configured"] }, { status: 503 });
	}

	const params = new URL(request.url).searchParams;
	const code = params.get("code");
	const state = params.get("state");
	const remembered = await consumeState(provider);

	if (code === null || state === null || remembered === null
		|| !sameState(state, remembered.state))
	{
		return back(request, "/login", "state");
	}

	const accessToken = await exchangeCode(provider, config, code);
	if (accessToken === null)
	{
		return back(request, "/login", "exchange");
	}

	const profile = await fetchOAuthProfile(provider, config, accessToken);
	if (profile === null)
	{
		return back(request, "/login", "profile");
	}

	const session = await getSession();

	if (remembered.mode === "link")
	{
		if (session === null)
		{
			return back(request, "/login", "session");
		}

		try
		{
			linkOAuthAccount({
				provider,
				provider_user_id: profile.providerUserId,
				user_id: session.sub,
				email: profile.email,
			});
		}
		catch (error)
		{
			if (error instanceof ConstraintError)
			{
				return back(request, "/settings", "already_linked");
			}
			throw error;
		}

		return back(request, "/settings", "linked");
	}

	const linked = findOAuthAccount(provider, profile.providerUserId);
	if (linked !== undefined)
	{
		await setAuthCookies(linked.user_id);

		return back(request, "/feed");
	}

	if (profile.email !== null && profile.emailVerified)
	{
		const known = findUserByEmail(profile.email);
		if (known !== undefined)
		{
			try
			{
				linkOAuthAccount({
					provider,
					provider_user_id: profile.providerUserId,
					user_id: known.id,
					email: profile.email,
				});
			}
			catch (error)
			{
				if (error instanceof ConstraintError)
				{
					return back(request, "/login", "already_linked");
				}
				throw error;
			}
			if (known.is_verified !== 1)
			{
				users.updateById(known.id, { is_verified: 1 });
			}
			await setAuthCookies(known.id);

			return back(request, "/feed");
		}
	}

	if (profile.email === null || !profile.emailVerified)
	{
		return back(request, "/signup", "email");
	}

	const draft = sealOauthDraft({
		provider,
		provider_user_id: profile.providerUserId,
		providerName: NAMES[provider],
		email: profile.email,
		email_verified: profile.emailVerified,
		username: await suggestUsername(profile.username),
		first_name: profile.firstName ?? "",
		last_name: profile.lastName ?? "",
		avatar_url: profile.avatarUrl,
	});

	const store = await cookies();
	store.set(OAUTH_DRAFT_COOKIE, draft, {
		httpOnly: true,
		sameSite: "lax",
		path: "/",
		secure: process.env.NODE_ENV === "production",
		maxAge: OAUTH_DRAFT_TTL_SECONDS,
	});

	return back(request, "/signup/oauth");
}
