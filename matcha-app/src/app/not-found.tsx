import type { Metadata } from "next";
import { NotFoundPage } from "@/views/NotFound/NotFoundPage";

export const metadata: Metadata = {
	title: "Page introuvable",
	description: "Cette page n’existe pas.",
};

export default function NotFound() {
	return <NotFoundPage />;
}
