"use client";

import { useEffect, useState } from "react";
import { PRESENCE_BEAT_MS } from "@/lib/db/schema/views";
import { send } from "@/lib/http/client";
import { announcePresence } from "@/lib/realtime/client";

interface Beat {
	channel: string;
}

export function PresenceHeartbeat() {
	const [channel, setChannel] = useState<string | null>(null);

	useEffect(() => {
		let live = true;

		const beat = () => {
			if (!live || document.visibilityState === "hidden") {
				return;
			}
			void send<Beat>("POST", "/api/presence", {}).then((result) => {
				if (live && result.ok) {
					setChannel(result.data.channel);
				}
			});
		};

		beat();
		const timer = window.setInterval(beat, PRESENCE_BEAT_MS);
		document.addEventListener("visibilitychange", beat);

		return () => {
			live = false;
			window.clearInterval(timer);
			document.removeEventListener("visibilitychange", beat);
		};
	}, []);

	useEffect(() => {
		if (channel === null) {
			return;
		}
		return announcePresence(channel);
	}, [channel]);

	return null;
}
