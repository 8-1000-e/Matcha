import type { Metadata } from "next";
import { SignupPage } from "@/views/Signup/SignupPage";

export const metadata: Metadata = {
	title: "Créer un compte",
	description: "Créez votre compte Brewmance.",
};

export default function Page() {
	return <SignupPage />;
}
