import { isUsernameTaken } from "@/lib/db";
import type { OAuthProvider } from "@/lib/db/types";
import { redirectUri, type ProviderConfig } from "./providers";

export interface OAuthProfile {
	providerUserId: string;
	email: string | null;
	emailVerified: boolean;
	username: string | null;
	firstName: string | null;
	lastName: string | null;
	avatarUrl: string | null;
}

export interface OAuthTokens {
	accessToken: string;
	refreshToken: string | null;
}

export async function exchangeCode(provider: OAuthProvider, config: ProviderConfig, code: string): Promise<OAuthTokens | null>
{
	const body = new URLSearchParams();
	body.set("grant_type", "authorization_code");
	body.set("client_id", config.clientId);
	body.set("client_secret", config.clientSecret);
	body.set("code", code);
	body.set("redirect_uri", redirectUri(provider));

	let response: Response;
	try
	{
		response = await fetch(config.tokenUrl, {
			method: "POST",
			headers: {
				"content-type": "application/x-www-form-urlencoded",
				accept: "application/json",
			},
			body,
		});
	}
	catch
	{
		return null;
	}
	if (!response.ok)
	{
		return null;
	}

	const parsed = (await response.json()) as {
		access_token?: unknown;
		refresh_token?: unknown;
	};

	if (typeof parsed.access_token !== "string")
	{
		return null;
	}

	return {
		accessToken: parsed.access_token,
		refreshToken: typeof parsed.refresh_token === "string" ? parsed.refresh_token : null,
	};
}

interface IntraProfile {
	id?: unknown;
	login?: unknown;
	email?: unknown;
	first_name?: unknown;
	last_name?: unknown;
	image?: { link?: unknown } | null;
}

interface GoogleProfile {
	sub?: unknown;
	email?: unknown;
	email_verified?: unknown;
	given_name?: unknown;
	family_name?: unknown;
	picture?: unknown;
}

function text(value: unknown): string | null
{
	return typeof value === "string" && value.length > 0 ? value : null;
}

export async function fetchOAuthProfile(provider: OAuthProvider, config: ProviderConfig, accessToken: string): Promise<OAuthProfile | null>
{
	let response: Response;
	try
	{
		response = await fetch(config.profileUrl, {
			headers: {
				authorization: `Bearer ${accessToken}`,
				accept: "application/json",
			},
		});
	}
	catch
	{
		return null;
	}
	if (!response.ok)
	{
		return null;
	}

	const payload = (await response.json()) as IntraProfile & GoogleProfile;

	if (provider === "42")
	{
		const id = typeof payload.id === "number" ? String(payload.id) : text(payload.id);
		if (id === null)
		{
			return null;
		}

		return {
			providerUserId: id,
			email: text(payload.email),
			emailVerified: true,
			username: text(payload.login),
			firstName: text(payload.first_name),
			lastName: text(payload.last_name),
			avatarUrl: text(payload.image?.link),
		};
	}

	const sub = text(payload.sub);
	if (sub === null)
	{
		return null;
	}

	return {
		providerUserId: sub,
		email: text(payload.email),
		emailVerified: payload.email_verified === true,
		username: null,
		firstName: text(payload.given_name),
		lastName: text(payload.family_name),
		avatarUrl: text(payload.picture),
	};
}

const UNSAFE_USERNAME_RE = /[^a-z0-9._-]/g;

const USERNAME_MAX = 32;

export async function suggestUsername(wanted: string | null): Promise<string>
{
	const cleaned = (wanted ?? "")
		.toLowerCase()
		.replace(UNSAFE_USERNAME_RE, "")
		.slice(0, USERNAME_MAX);
	const base = cleaned.length >= 3 ? cleaned : "matcha";

	if (!isUsernameTaken(base))
	{
		return base;
	}

	for (let suffix = 2; suffix < 1000; suffix += 1)
	{
		const room = USERNAME_MAX - String(suffix).length;
		const candidate = `${base.slice(0, room)}${suffix}`;
		if (!isUsernameTaken(candidate))
		{
			return candidate;
		}
	}

	return "";
}

