import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { fetchCurrentUser } from "@/lib/auth/serverUser";
import { CompleteProfilePage } from "@/views/CompleteProfile/CompleteProfilePage";

export const metadata: Metadata = {
	title: "Compléter mon profil",
	description: "Complétez votre profil pour commencer à utiliser Brewmance.",
};

export default async function Page() {
	const user = await fetchCurrentUser();
	if (!user) {
		redirect("/login");
	}
	if (!user.is_verified) {
		redirect("/verify-email");
	}
	if (user.missing.length === 0) {
		redirect("/me");
	}

	return <CompleteProfilePage missing={user.missing} />;
}
