import { hashToken } from "@/lib/auth/tokens";
import { consumeEmailToken, findUsableEmailToken, markUserVerified } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(request: Request)
{
	const token = new URL(request.url).searchParams.get("token");
	if (!token)
	{return Response.json({ errors: ["token is required"] }, { status: 400 });}

	const tokenFound = findUsableEmailToken(hashToken(token), "email_verification");
	if (!tokenFound)
	{return Response.json({ errors: ["invalid or expired token"] }, { status: 400 });}

	const consumed = consumeEmailToken(tokenFound.id);
	if (!consumed)
	{return Response.json({ errors: ["token has already been used"] }, { status: 400 });}


	await markUserVerified(tokenFound.user_id);

	return Response.redirect(new URL("/login?verified=1", process.env.APP_URL));
}
