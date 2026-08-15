import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { fetchProfile } from "@/lib/profile/serverProfile";
import { CompleteProfilePage } from "@/views/CompleteProfile/CompleteProfilePage";

export const metadata: Metadata = {
	title: "Compléter mon profil",
	description: "Complétez votre profil pour commencer à utiliser Brewmance.",
};

export default async function Page() {
	const profile = await fetchProfile();
	if (!profile) {
		redirect("/login");
	}
	if (!profile.is_verified) {
		redirect("/verify-email");
	}
	if (profile.missing.length === 0) {
		redirect("/feed");
	}

	return <CompleteProfilePage initial={profile} />;
}
