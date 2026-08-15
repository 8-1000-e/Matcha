import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { fetchCurrentUser } from "@/lib/auth/serverUser";
import { LikesPage } from "@/views/Activity/LikesPage";

export const metadata: Metadata = {
	title: "Likes reçus",
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

	return <LikesPage />;
}
