import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { fetchCurrentUser } from "@/lib/auth/serverUser";
import { ThreadPage } from "@/views/Thread/ThreadPage";

export const metadata: Metadata = {
	title: "Conversation",
	description: "Votre conversation Brewmance.",
};

export default async function Page({ params }: PageProps<"/messages/[matchId]">) {
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

	const { matchId } = await params;

	return <ThreadPage matchId={matchId} userId={user.id} />;
}
