import type { Metadata } from "next";
import { requirePrivateUser } from "@/lib/auth/serverUser";
import { LikesPage } from "@/views/Activity/LikesPage";

export const metadata: Metadata = {
	title: "Likes reçus",
};

export default async function Page() {
	await requirePrivateUser();

	return <LikesPage />;
}
