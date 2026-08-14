"use client";

import { useEffect } from "react";
import { PRESENCE_BEAT_MS } from "@/lib/db/schema/views";
import { send } from "@/lib/http/client";

export function PresenceHeartbeat() {
	useEffect(() => {
		let live = true;

		const beat = () => {
			if (!live || document.visibilityState === "hidden") {
				return;
			}
			void send("POST", "/api/presence", {});
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

	return null;
}
