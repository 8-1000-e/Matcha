import type { Metadata } from "next";
import { requirePrivateUser } from "@/lib/auth/serverUser";
import { SettingsPage } from "@/views/Settings/SettingsPage";

export const metadata: Metadata = {
	title: "Réglages",
	description: "Vos réglages Brewmance.",
};

export default async function Page() {
	await requirePrivateUser();

	return <SettingsPage />;
}
