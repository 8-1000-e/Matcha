import type { Metadata } from "next";
import { requirePrivateUser } from "@/lib/auth/serverUser";
import { AccountPage } from "@/views/Account/AccountPage";

export const metadata: Metadata = {
	title: "Mon compte",
	description: "Votre compte Brewmance.",
};

export default async function Page() {
	await requirePrivateUser();

	return <AccountPage />;
}
