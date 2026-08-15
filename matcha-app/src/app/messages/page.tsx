import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { fetchCurrentUser } from "@/lib/auth/serverUser";
import { InboxPage } from "@/views/Inbox/InboxPage";

export const metadata: Metadata = {
	title: "Messages",
	description: "Vos conversations Brewmance.",
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

	return <InboxPage userId={user.id} />;
}
