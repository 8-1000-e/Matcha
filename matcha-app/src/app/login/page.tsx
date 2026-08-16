import type { Metadata } from "next";
import { redirectIfSignedIn } from "@/lib/auth/serverUser";
import { oauthMessage } from "@/lib/oauth/messages";
import { LoginPage, type LoginNotice } from "@/views/Login/LoginPage";

export const metadata: Metadata = {
	title: "Se connecter",
	description: "Connectez-vous à Brewmance.",
};

function readNotice(query: Record<string, string | string[] | undefined>) {
	const keys: LoginNotice[] = ["verified", "reset", "created"];
	return keys.find((key) => query[key] === "1");
}

export default async function Page({ searchParams }: PageProps<"/login">) {
	await redirectIfSignedIn();

	const query = await searchParams;
	const oauth = query.oauth;

	return (
		<LoginPage
			notice={readNotice(query)}
			oauthMessage={oauthMessage(typeof oauth === "string" ? oauth : undefined)}
		/>
	);
}
