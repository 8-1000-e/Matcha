import type { Metadata } from "next";
import { ResetPasswordPage } from "@/views/ResetPassword/ResetPasswordPage";

export const metadata: Metadata = {
	title: "Nouveau mot de passe",
	description: "Choisissez un nouveau mot de passe pour votre compte Brewmance.",
};

export default async function Page({ searchParams }: PageProps<"/reset-password">) {
	const { token } = await searchParams;
	return <ResetPasswordPage token={typeof token === "string" ? token : ""} />;
}
