import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requirePrivateUser } from "@/lib/auth/serverUser";
import {
	fetchPublicProfileOnServer,
	fetchReviewsOnServer,
} from "@/lib/profile/serverProfile";
import { BlockedProfilePage } from "@/views/Profile/BlockedProfilePage";
import { PublicProfilePage } from "@/views/Profile/PublicProfilePage";

export const metadata: Metadata = {
	title: "Profil",
	description: "Le profil d’un membre de Brewmance.",
};

export default async function Page({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const user = await requirePrivateUser();

	const { id } = await params;
	if (id === user.id) {
		redirect("/me");
	}

	const result = await fetchPublicProfileOnServer(id);
	if (result.status === "missing") {
		notFound();
	}
	if (result.status === "blocked") {
		return <BlockedProfilePage userId={id} by={result.by} />;
	}

	const reviews = await fetchReviewsOnServer(id);

	return (
		<PublicProfilePage
			profile={result.profile}
			reviews={reviews}
			viewerId={user.id}
		/>
	);
}
