"use client";

import { useEffect } from "react";
import { send } from "@/lib/http/client";

const BEAT_INTERVAL_MS = 30_000;

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
		const timer = window.setInterval(beat, BEAT_INTERVAL_MS);
		document.addEventListener("visibilitychange", beat);

		return () => {
			live = false;
			window.clearInterval(timer);
			document.removeEventListener("visibilitychange", beat);
		};
	}, []);

	return null;
}
