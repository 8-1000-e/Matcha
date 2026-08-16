import type { Metadata } from "next";
import { requirePrivateUser } from "@/lib/auth/serverUser";
import { oauthMessage } from "@/lib/oauth/messages";
import { SettingsPage } from "@/views/Settings/SettingsPage";

export const metadata: Metadata = {
	title: "Réglages",
	description: "Vos réglages Brewmance.",
};

export default async function Page({ searchParams }: PageProps<"/settings">) {
	await requirePrivateUser();

	const { oauth } = await searchParams;

	return (
		<SettingsPage
			oauthMessage={oauthMessage(typeof oauth === "string" ? oauth : undefined)}
		/>
	);
}
