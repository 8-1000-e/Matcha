import { cookies } from "next/headers";
import { setAuthCookies } from "@/lib/auth/session";
import { hashToken } from "@/lib/auth/tokens";
import {
	findUsableRefreshToken,
	purgeIfDue,
	refreshTokens,
	revokeAllRefreshTokens,
	revokeRefreshToken,
	users,
} from "@/lib/db";

export async function POST()
{
	purgeIfDue();

	const cookie = (await cookies()).get("refresh")?.value;
	if (!cookie)
	{
		return Response.json({ errors: ["refresh token is required"] }, { status: 401 });
	}

	const hash = hashToken(cookie);
	const tokenFound = findUsableRefreshToken(hash);
	if (!tokenFound)
	{
		// Le jeton est inconnu, expire, ou DEJA REVOQUE. Ce dernier cas est
		// suspect : un jeton revoque a soit ete rejoue par erreur, soit vole
		// avant que le client legitime ne le renouvelle. On coupe toutes les
		// sessions de l'utilisateur plutot que de laisser tourner celle du
		// voleur.
		const known = refreshTokens.findOne({ token_hash: hash });
		if (known)
		{
			revokeAllRefreshTokens(known.user_id);
		}
		return Response.json({ errors: ["invalid session"] }, { status: 401 });
	}

	const user = users.findById(tokenFound.user_id);
	if (!user)
	{
		return Response.json({ errors: ["unauthorized"] }, { status: 401 });
	}

	revokeRefreshToken(tokenFound.token_hash);
	await setAuthCookies(user.id);

	return Response.json({ ok: true });
}
