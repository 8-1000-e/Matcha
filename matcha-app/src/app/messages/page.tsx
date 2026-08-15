import type { Metadata } from "next";
import { requirePrivateUser } from "@/lib/auth/serverUser";
import { InboxPage } from "@/views/Inbox/InboxPage";

export const metadata: Metadata = {
	title: "Messages",
	description: "Vos conversations Brewmance.",
};

export default async function Page() {
	const user = await requirePrivateUser();

	return <InboxPage userId={user.id} />;
}
