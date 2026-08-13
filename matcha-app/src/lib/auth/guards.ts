import type { UserRow } from "@/lib/db";
import { requireUser } from "./session";

export type SessionResult =
	| { ok: true; user: UserRow }
	| { ok: false; response: Response };

export async function requireSession(): Promise<SessionResult>
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
