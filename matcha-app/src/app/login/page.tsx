import type { Metadata } from "next";
import { LoginPage } from "@/views/Login/LoginPage";

export const metadata: Metadata = {
	title: "Se connecter",
	description: "Connectez-vous à Brewmance.",
};

export default async function Page({ searchParams }: PageProps<"/login">) {
	const { created } = await searchParams;
	return <LoginPage created={created === "1"} />;
}
