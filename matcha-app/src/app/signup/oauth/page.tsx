import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { OauthDraft } from "@/components/Form/AuthForms";
import { OAUTH_DRAFT_COOKIE, readOauthDraft } from "@/lib/oauth/draft";
import { OauthSignupPage } from "@/views/Signup/OauthSignupPage";

export const metadata: Metadata = {
	title: "Terminer l’inscription",
	description: "Choisissez votre nom d’utilisateur pour finir votre inscription.",
};

export default async function Page() {
	const store = await cookies();
	const draft: OauthDraft | null = readOauthDraft(store.get(OAUTH_DRAFT_COOKIE)?.value);
	if (draft === null) {
		redirect("/signup");
	}

	return <OauthSignupPage draft={draft} />;
}
