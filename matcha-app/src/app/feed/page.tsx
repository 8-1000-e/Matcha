import type { Metadata } from "next";
import { requirePrivateUser } from "@/lib/auth/serverUser";
import { listTags } from "@/lib/db";
import { fetchInitialFeed } from "@/lib/discovery/serverFeed";
import { FeedPage } from "@/views/Feed/FeedPage";

export const metadata: Metadata = {
	title: "Suggestions",
	description: "Les profils qui vous correspondent sur Brewmance.",
};

export default async function Page() {
	const user = await requirePrivateUser();

	const initial = await fetchInitialFeed();
	const tags = listTags().map((tag) => ({ id: tag.id, label: tag.label }));

	return (
		<FeedPage firstName={user.first_name} initial={initial} tags={tags} />
	);
}
