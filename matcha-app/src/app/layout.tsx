import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
	title: {
		default: "Brewmance",
		template: "%s · Brewmance",
	},
	description: "Site de rencontre.",
};

export const viewport: Viewport = {
	themeColor: "#f4f8ee",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
	return (
		<html lang="fr" className={geist.className}>
			<body className="flex min-h-dvh flex-col">{children}</body>
		</html>
	);
}
