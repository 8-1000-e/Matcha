import type { Metadata } from "next";
import { requirePrivateUser } from "@/lib/auth/serverUser";
import { SearchPage } from "@/views/Search/SearchPage";

export const metadata: Metadata = {
	title: "Rechercher",
	description: "Trouvez quelqu’un par son nom, son prénom ou son nom d’utilisateur.",
};

export default async function Page() {
	await requirePrivateUser();

	return <SearchPage />;
}
