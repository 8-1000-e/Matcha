import { hashToken } from "@/lib/auth/tokens";
import { consumeEmailToken, findUsableEmailToken, markUserVerified, transaction } from "@/lib/db";

function expired(): Response
{
	return Response.redirect(
		new URL("/link-expired?type=verification", process.env.APP_URL),
	);
}

export async function GET(request: Request)
{
	const token = new URL(request.url).searchParams.get("token");
	if (!token)
	{return expired();}

	const tokenFound = findUsableEmailToken(hashToken(token), "email_verification");
	if (!tokenFound)
	{return expired();}

	// Consommation et passage de is_verified dans la meme transaction : sinon un
	// echec entre les deux brule le lien sans verifier le compte, et l'utilisateur
	// n'a plus qu'a en redemander un.
	const verified = transaction(() => {
		if (!consumeEmailToken(tokenFound.id))
		{
			return false;
		}
		markUserVerified(tokenFound.user_id);
		return true;
	});

	if (!verified)
	{return expired();}

	return Response.redirect(new URL("/login?verified=1", process.env.APP_URL));
}
