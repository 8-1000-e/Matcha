import type { Metadata } from "next";
import { PrivacyPage } from "@/views/Privacy/PrivacyPage";

export const metadata: Metadata = {
	title: "Données personnelles",
	description:
		"Ce que Brewmance collecte, pourquoi, combien de temps, et vos droits.",
};

export default function Page() {
	return <PrivacyPage />;
}
