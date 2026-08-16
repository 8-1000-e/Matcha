"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { conversationLink } from "@/lib/notifications/notifications";
import { CallPanel } from "./CallPanel";
import { useCall } from "./CallProvider";

export function FloatingCall() {
	const call = useCall();
	const pathname = usePathname();

	if (call.phase === "idle" || call.matchId === null) {
		return null;
	}
	if (call.phase === "ringing" && call.incoming) {
		return null;
	}

	const link = conversationLink(call.matchId);
	if (pathname === link) {
		return null;
	}

	return (
		<div className="fixed inset-x-0 top-2 z-40 mx-auto w-full max-w-md px-4">
			<div className="rounded-xl bg-cream shadow-lg">
				<CallPanel />
				<Link
					href={link}
					className="block rounded-b-xl px-3 pb-2 text-center text-xs text-matcha-dark underline underline-offset-2"
				>
					Revenir à la conversation
				</Link>
			</div>
		</div>
	);
}
