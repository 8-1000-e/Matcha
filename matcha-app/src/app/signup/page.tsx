import type { Metadata } from "next";
import { redirectIfSignedIn } from "@/lib/auth/serverUser";
import { SignupPage } from "@/views/Signup/SignupPage";

export const metadata: Metadata = {
	title: "Créer un compte",
	description: "Créez votre compte Brewmance.",
};

export default async function Page() {
	await redirectIfSignedIn();

	return <SignupPage />;
}
