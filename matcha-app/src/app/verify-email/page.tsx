import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { fetchCurrentUser } from "@/lib/auth/serverUser";
import { VerifyEmailPage } from "@/views/VerifyEmail/VerifyEmailPage";

export const metadata: Metadata = {
	title: "Vérifier mon adresse",
	description: "Confirmez votre adresse e-mail pour activer votre compte.",
};

export default async function Page() {
	const user = await fetchCurrentUser();
	if (!user) {
		redirect("/login");
	}
	if (user.is_verified) {
		redirect("/me");
	}

	return <VerifyEmailPage firstName={user.first_name} />;
}
