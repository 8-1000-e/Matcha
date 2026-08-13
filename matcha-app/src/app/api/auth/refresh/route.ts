import { cookies } from "next/headers";
import { setAuthCookies } from "@/lib/auth/session";
import { hashToken } from "@/lib/auth/tokens";
import {
	findUsableRefreshToken,
	purgeIfDue,
	revokeAllRefreshTokens,
	revokeRefreshToken,
	transaction,
	users,
} from "@/lib/db";
import { findRefreshTokenByHash } from "@/lib/db/repositories/tokens";
const RETRY_WINDOW_MS = 30_000;

type Outcome =
	| { kind: "rotated"; userId: string }
	| { kind: "raced" }
	| { kind: "replayed"; userId: string }
	| { kind: "unknown" };

export async function POST()
{
	purgeIfDue();

	const cookie = (await cookies()).get("refresh")?.value;
	if (!cookie)
	{
		return Response.json({ errors: ["refresh token is required"] }, { status: 401 });
	}

	const hash = hashToken(cookie);
	const outcome = transaction<Outcome>(() => {
		const usable = findUsableRefreshToken(hash);
		if (usable && revokeRefreshToken(usable.token_hash))
		{
			return { kind: "rotated", userId: usable.user_id };
		}

		const known = findRefreshTokenByHash(hash);
		if (!known)
		{
			return { kind: "unknown" };
		}
		if (known.revoked_at !== null
			&& Date.now() - Date.parse(known.revoked_at) < RETRY_WINDOW_MS)
		{
			return { kind: "raced" };
		}
		return { kind: "replayed", userId: known.user_id };
	});

	if (outcome.kind === "raced")
	{
		return Response.json({ errors: ["refresh_retry"] }, { status: 401 });
	}

	if (outcome.kind !== "rotated")
	{
		if (outcome.kind === "replayed")
		{
			revokeAllRefreshTokens(outcome.userId);
		}
		return Response.json({ errors: ["invalid session"] }, { status: 401 });
	}

	const user = users.findById(outcome.userId);
	if (!user)
	{
		return Response.json({ errors: ["unauthorized"] }, { status: 401 });
	}

	await setAuthCookies(user.id);

	return Response.json({ ok: true });
}