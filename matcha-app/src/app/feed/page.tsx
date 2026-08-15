import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { fetchCurrentUser } from "@/lib/auth/serverUser";
import { fetchInitialFeed } from "@/lib/discovery/serverFeed";
import { FeedPage } from "@/views/Feed/FeedPage";

export const metadata: Metadata = {
	title: "Suggestions",
	description: "Les profils qui vous correspondent sur Brewmance.",
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

	const initial = await fetchInitialFeed();

	return <FeedPage firstName={user.first_name} initial={initial} />;
}
