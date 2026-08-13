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
// Non reexporte par @/lib/db (fichier hors perimetre de cette correction).
import { findRefreshTokenByHash } from "@/lib/db/repositories/tokens";

// Deux onglets dont le cookie `access` expire en meme temps envoient deux
// refresh portant le meme jeton. Le perdant ne doit pas etre pris pour un vol :
// en dessous de cette fenetre, on considere que c'est le meme client qui rejoue.
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

	// Lecture et revocation dans la meme transaction, et revokeRefreshToken qui
	// renvoie false vaut "quelqu'un d'autre a gagne la course" : sans cela deux
	// refresh concurrents passent tous les deux.
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
		// Jeton revoque de longue date ou perime : soit un rejeu par erreur,
		// soit un vol avant que le client legitime ne le renouvelle. On coupe
		// toutes les sessions plutot que de laisser tourner celle du voleur.
		return { kind: "replayed", userId: known.user_id };
	});

	if (outcome.kind === "raced")
	{
		// La requete gagnante a deja pose les nouveaux cookies : le client n'a
		// qu'a rejouer. Ni revocation de la famille, ni effacement des cookies.
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
