import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { fetchCurrentUser } from "@/lib/auth/serverUser";
import { AccountDeletedPage } from "@/views/AccountDeleted/AccountDeletedPage";

export const metadata: Metadata = {
	title: "Compte supprimé",
	description: "Votre compte est en attente d’effacement.",
};

export default async function Page() {
	const user = await fetchCurrentUser();
	if (!user) {
		redirect("/login");
	}
	if (user.deleted_at === null || user.purge_at === null) {
		redirect("/feed");
	}

	return <AccountDeletedPage purgeAt={user.purge_at} />;
}
