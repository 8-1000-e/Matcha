import { NextResponse } from "next/server";
import { authorizeUrl, isOAuthProvider, providerConfig } from "@/lib/oauth/providers";
import { createState, rememberState, type OAuthMode } from "@/lib/oauth/state";

interface Context {
	params: Promise<{ provider: string }>;
}

export async function GET(request: Request, context: Context)
{
	const { provider } = await context.params;
	if (!isOAuthProvider(provider))
	{
		return Response.json({ errors: ["not found"] }, { status: 404 });
	}

	const config = providerConfig(provider);
	if (!config)
	{
		return Response.json({ errors: ["provider not configured"] }, { status: 503 });
	}

	const wanted = new URL(request.url).searchParams.get("mode");
	const mode: OAuthMode = wanted === "link" ? "link" : "login";
	const state = createState();

	await rememberState(provider, { state, mode });

	return NextResponse.redirect(authorizeUrl(provider, config, state));
}
