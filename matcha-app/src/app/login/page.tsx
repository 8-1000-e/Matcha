import type { Metadata } from "next";
import { LoginPage, type LoginNotice } from "@/views/Login/LoginPage";

export const metadata: Metadata = {
	title: "Se connecter",
	description: "Connectez-vous à Brewmance.",
};

function readNotice(query: Record<string, string | string[] | undefined>) {
	const keys: LoginNotice[] = ["verified", "reset", "created"];
	return keys.find((key) => query[key] === "1");
}

export default async function Page({ searchParams }: PageProps<"/login">) {
	return <LoginPage notice={readNotice(await searchParams)} />;
}
