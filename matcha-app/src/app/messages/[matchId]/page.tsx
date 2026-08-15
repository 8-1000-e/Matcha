import type { Metadata } from "next";
import { requirePrivateUser } from "@/lib/auth/serverUser";
import { ThreadPage } from "@/views/Thread/ThreadPage";

export const metadata: Metadata = {
	title: "Conversation",
	description: "Votre conversation Brewmance.",
};

export default async function Page({ params }: PageProps<"/messages/[matchId]">) {
	const user = await requirePrivateUser();

	const { matchId } = await params;

	return <ThreadPage matchId={matchId} userId={user.id} />;
}
