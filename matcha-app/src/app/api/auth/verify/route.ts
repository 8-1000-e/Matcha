import { hashToken } from "@/lib/auth/tokens";
import { consumeEmailToken, findUsableEmailToken, markUserVerified } from "@/lib/db";

export const runtime = "nodejs";

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

	const consumed = consumeEmailToken(tokenFound.id);
	if (!consumed)
	{return expired();}


	await markUserVerified(tokenFound.user_id);

	return Response.redirect(new URL("/login?verified=1", process.env.APP_URL));
}
