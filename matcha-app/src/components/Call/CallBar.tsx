"use client";

import { CallPanel } from "./CallPanel";
import { useCall } from "./CallProvider";

export function CallBar({ matchId }: { matchId: string }) {
	const call = useCall();

	if (call.phase === "idle" || call.matchId !== matchId) {
		return null;
	}

	return (
		<div className="mx-auto w-full max-w-md shrink-0 px-4 pb-2 sm:px-6">
			<CallPanel />
		</div>
	);
}
