import type { Metadata } from "next";
import { requirePrivateUser } from "@/lib/auth/serverUser";
import { ViewsPage } from "@/views/Activity/ViewsPage";

export const metadata: Metadata = {
	title: "Visites",
};

export default async function Page() {
	await requirePrivateUser();

	return <ViewsPage />;
}
