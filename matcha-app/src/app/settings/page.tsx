import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { fetchCurrentUser } from "@/lib/auth/serverUser";
import { SettingsPage } from "@/views/Settings/SettingsPage";

export const metadata: Metadata = {
	title: "Réglages",
	description: "Vos réglages Brewmance.",
};

export default async function Page() {
	const user = await fetchCurrentUser();
	if (!user) {
		redirect("/login");
	}
	if (!user.is_verified) {
		redirect("/verify-email");
	}
	if (user.missing.length > 0) {
		redirect("/complete-profile");
	}

	return <SettingsPage />;
}
