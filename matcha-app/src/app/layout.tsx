import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { cookies } from "next/headers";
import { CallError } from "@/components/Call/CallError";
import { CallProvider } from "@/components/Call/CallProvider";
import { FloatingCall } from "@/components/Call/FloatingCall";
import { IncomingCall } from "@/components/Call/IncomingCall";
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

export default async function RootLayout({ children }: LayoutProps<"/">) {
	const store = await cookies();
	const signedIn = store.get("refresh") !== undefined;

	return (
		<html lang="fr" className={geist.className}>
			<body className="flex min-h-dvh flex-col">
				<CallProvider enabled={signedIn}>
					{children}
					<IncomingCall />
					<FloatingCall />
					<CallError />
				</CallProvider>
			</body>
		</html>
	);
}
