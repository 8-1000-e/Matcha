import { randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import type { OAuthProvider } from "@/lib/db/types";

export type OAuthMode = "login" | "link";

export interface OAuthState {
	state: string;
	mode: OAuthMode;
}

export const STATE_TTL_SECONDS = 600;

export function cookieName(provider: OAuthProvider): string
{
	return `oauth_state_${provider}`;
}

export function createState(): string
{
	return randomBytes(32).toString("hex");
}

export function sameState(received: string, expected: string): boolean
{
	const recBuff = Buffer.from(received);
	const expBuff = Buffer.from(expected);

	if (recBuff.length !== expBuff.length)
	{
		return false;
	}
	return timingSafeEqual(recBuff, expBuff);
}

export async function rememberState(provider: OAuthProvider, value: OAuthState): Promise<void>
{
	const store = await cookies();

	store.set(cookieName(provider), JSON.stringify(value), {
		httpOnly: true,
		sameSite: "lax",
		path: "/",
		secure: process.env.NODE_ENV === "production",
		maxAge: STATE_TTL_SECONDS,
	});
}

export async function consumeState(provider: OAuthProvider): Promise<OAuthState | null>
{
	const store = await cookies();
	const cookie = store.get(cookieName(provider));

	if (!cookie)
	{
		return null;
	}
	store.delete(cookieName(provider));

	let parsed: unknown;
	try
	{
		parsed = JSON.parse(cookie.value);
	}
	catch
	{
		return null;
	}

	if (typeof parsed !== "object" || parsed === null)
	{
		return null;
	}

	const { state, mode } = parsed as Partial<OAuthState>;
	if (typeof state !== "string" || (mode !== "login" && mode !== "link"))
	{
		return null;
	}

	return { state, mode };
}
