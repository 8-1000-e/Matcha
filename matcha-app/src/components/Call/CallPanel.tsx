"use client";

import { PresenceAvatar } from "@/components/Presence/PresenceAvatar";
import { callTimer } from "@/lib/calls/format";
import { HangUpIcon, MicIcon } from "./CallIcons";
import { useCall } from "./CallProvider";

const STATE_LABELS: Record<string, string> = {
	calling: "Sonnerie…",
	ringing: "Appel entrant…",
	connecting: "Connexion…",
};

export function CallPanel() {
	const call = useCall();
	const name = call.peer?.name ?? "Conversation";
	const state
		= call.phase === "active"
			? callTimer(call.seconds)
			: (STATE_LABELS[call.phase] ?? "");

	return (
		<div className="flex items-center gap-3 rounded-xl border border-matcha/30 bg-leaf/50 px-3 py-2">
			<PresenceAvatar
				url={call.peer?.photo_url ?? null}
				name={name}
				online
				size="small"
			/>

			<span className="min-w-0 flex-1">
				<span className="block truncate text-sm font-medium text-ink">
					{name}
				</span>
				<span className="block text-xs tabular-nums text-matcha-dark">
					{state}
				</span>
			</span>

			<button
				type="button"
				onClick={call.toggleMute}
				disabled={call.phase !== "active"}
				aria-label={call.muted ? "Réactiver le micro" : "Couper le micro"}
				aria-pressed={call.muted}
				className={`inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-edge/60 transition-colors duration-200 ease-out disabled:cursor-not-allowed disabled:opacity-50 ${
					call.muted ? "bg-ink/10 text-ink" : "bg-white/70 text-ink"
				}`}
			>
				<MicIcon className="size-4" muted={call.muted} />
			</button>

			<button
				type="button"
				onClick={call.hangUp}
				aria-label="Raccrocher"
				className="inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-lg bg-red-600 text-white transition-colors duration-200 ease-out hover:bg-red-700"
			>
				<HangUpIcon className="size-4" />
			</button>
		</div>
	);
}
