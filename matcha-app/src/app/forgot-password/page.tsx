import type { Metadata } from "next";
import { ForgotPasswordPage } from "@/views/ForgotPassword/ForgotPasswordPage";

export const metadata: Metadata = {
	title: "Mot de passe oublié",
	description: "Recevez un lien pour choisir un nouveau mot de passe.",
};

export default function Page() {
	return <ForgotPasswordPage />;
}
