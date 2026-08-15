import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { fetchCurrentUser } from "@/lib/auth/serverUser";
import {
	fetchPublicProfileOnServer,
	fetchReviewsOnServer,
} from "@/lib/profile/serverProfile";
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

	const { id } = await params;
	if (id === user.id) {
		redirect("/me");
	}

	const profile = await fetchPublicProfileOnServer(id);
	if (profile === null) {
		notFound();
	}

	const reviews = await fetchReviewsOnServer(id);

	return <PublicProfilePage profile={profile} reviews={reviews} />;
}
