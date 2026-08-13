import type { UserRow } from "@/lib/db";
import { requireUser } from "./session";

export type SessionResult =
	| { ok: true; user: UserRow }
	| { ok: false; response: Response };

// Reserve aux routes qui doivent rester ouvertes a un compte non verifie
// (etat de session, deconnexion, refresh, verification et renvoi du lien) :
// les en fermer l'acces empecherait l'utilisateur de se verifier.
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

// Garde par defaut des routes protegees : sans le controle de is_verified, un
// compte non verifie appelant directement l'API contourne entierement la
// verification d'e-mail. Le code est distinct de "unauthorized" pour que le
// front puisse rediriger vers /verify-email au lieu de la page de connexion.
export async function requireSession(): Promise<SessionResult>
{
	const session = await requireAnySession();
	if (session.ok && session.user.is_verified !== 1)
	{
		return {
			ok: false,
			response: Response.json({ errors: ["email_not_verified"] }, { status: 403 }),
		};
	}
	return session;
}
