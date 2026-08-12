import type { Metadata } from "next";
import { HomePage } from "@/views/Home/HomePage";

export const metadata: Metadata = {
	title: "Brewmance",
	description:
		"Brewmance trie les profils par affinités, distance et centres d’intérêt communs.",
};

export default function Page() {
	return <HomePage />;
}
