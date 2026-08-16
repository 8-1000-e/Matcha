import { OAUTH_PROVIDERS, type OAuthProvider } from "@/lib/db/types";
import { CALENDAR_SCOPE } from "../calendar/google";

export interface ProviderConfig {
	clientId: string;
	clientSecret: string;
	authorizeUrl: string;
	tokenUrl: string;
	profileUrl: string;
	scope: string;
}

const ENDPOINTS: Record<
	OAuthProvider,
	Omit<ProviderConfig, "clientId" | "clientSecret">
> = {
	"42": {
		authorizeUrl: "https://api.intra.42.fr/oauth/authorize",
		tokenUrl: "https://api.intra.42.fr/oauth/token",
		profileUrl: "https://api.intra.42.fr/v2/me",
		scope: "public",
	},
	google: {
		authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
		tokenUrl: "https://oauth2.googleapis.com/token",
		profileUrl: "https://openidconnect.googleapis.com/v1/userinfo",
		scope: `openid email profile ${CALENDAR_SCOPE}`,
	},
};

export function isOAuthProvider(value: string): value is OAuthProvider
{
	return (OAUTH_PROVIDERS as readonly string[]).includes(value);
}

export function providerConfig(provider: OAuthProvider): ProviderConfig | null
{
	const clientId = provider === "42"
		? process.env.OAUTH_42_CLIENT_ID
		: process.env.OAUTH_GOOGLE_CLIENT_ID;
	const clientSecret = provider === "42"
		? process.env.OAUTH_42_CLIENT_SECRET
		: process.env.OAUTH_GOOGLE_CLIENT_SECRET;

	if (!clientId || !clientSecret)
	{
		return null;
	}

	return { clientId, clientSecret, ...ENDPOINTS[provider] };
}

export function redirectUri(provider: OAuthProvider): string 
{
	const base = process.env.OAUTH_REDIRECT_BASE ?? "http://localhost:3000";
	return `${base}/api/auth/${provider}/callback`;
}

export function authorizeUrl(provider: OAuthProvider, config: ProviderConfig, state: string): string
{
	const url = new URL(config.authorizeUrl);

	url.searchParams.set("client_id", config.clientId);
	url.searchParams.set("redirect_uri", redirectUri(provider));
	url.searchParams.set("response_type", "code");
	url.searchParams.set("scope", config.scope);
	url.searchParams.set("state", state);
	if (provider === "google")
	{
		url.searchParams.set("access_type", "offline");
		url.searchParams.set("prompt", "consent");
	}

	return url.toString();
}
