import type { UserRow } from "@/lib/db";
import { requireUser } from "./session";

export type SessionResult =
	| { ok: true; user: UserRow }
	| { ok: false; response: Response };
export async function requireAnySession(): Promise<SessionResult>
{
	const user = await requireUser();
	if (!user)
	{
		return {
			ok: false,
			response: Response.json({ errors: ["unauthorized"] }, { status: 401 }),
		};
	}
	return { ok: true, user };
}
export async function requireSession(): Promise<SessionResult>
{
	const session = await requireAnySession();
	if (session.ok && session.user.deleted_at !== null)
	{
		return {
			ok: false,
			response: Response.json({ errors: ["account_deleted"] }, { status: 403 }),
		};
	}
	if (session.ok && session.user.is_verified !== 1)
	{
		return {
			ok: false,
			response: Response.json({ errors: ["email_not_verified"] }, { status: 403 }),
		};
	}
	return session;
}