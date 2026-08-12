import type { Metadata } from "next";
import { LoginPage } from "@/views/Login/LoginPage";

export const metadata: Metadata = {
	title: "Se connecter",
	description: "Connectez-vous à Brewmance.",
};

export default function Page() {
	return <LoginPage />;
}
