import { cookies } from "next/headers";
import { issueRefreshToken, revokeRefreshToken, users, type UserRow } from "@/lib/db";
import {
	ACCESS_TTL,
	createRefreshToken,
	hashRefreshToken,
	REFRESH_TTL,
	signAccessToken,
	verifyAccessToken,
	type AccessPayload,
} from "./tokens";
const COOKIE_OPTIONS = {
	httpOnly: true,
	sameSite: "lax",
	secure: process.env.NODE_ENV === "production",
	path: "/",
} as const;

export async function setAuthCookies(userId: string): Promise<void>
{
	const JWT = signAccessToken(userId);
	const refresh = createRefreshToken();
	issueRefreshToken({
		user_id: userId, 
		token_hash: refresh.hash, 
		expires_at: refresh.expiresAt
	});

	const store = await cookies();
	store.set("access", JWT, { ...COOKIE_OPTIONS, maxAge: ACCESS_TTL });
	store.set("refresh", refresh.token, { ...COOKIE_OPTIONS, maxAge: REFRESH_TTL });
}

export async function clearAuthCookies(): Promise<void>
{
	const store = await cookies();

	const refreshToken = store.get("refresh")?.value;
	if (refreshToken)
	{
		revokeRefreshToken(hashRefreshToken(refreshToken));
	}

	store.set("access", "", { ...COOKIE_OPTIONS, maxAge: 0 });
	store.set("refresh", "", { ...COOKIE_OPTIONS, maxAge: 0 });
}

export async function getSession(): Promise<AccessPayload | null>
{
	const token = (await cookies()).get("access")?.value;
	if (!token)
	{return null;}
	return verifyAccessToken(token);
}

export async function requireUser(): Promise<UserRow | null>
{
	const session = await getSession();
	if (!session)
	{return null;}
	const user = users.findOne({ id: session.sub });
	return user ?? null;

}

