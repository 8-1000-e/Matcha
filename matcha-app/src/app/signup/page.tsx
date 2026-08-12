import type { Metadata } from "next";
import { SignupPage } from "@/views/Signup/SignupPage";

export const metadata: Metadata = {
	title: "Créer un compte",
	description: "Étape 1 sur 5 : votre compte Brewmance.",
};

export default function Page() {
	return <SignupPage />;
}
