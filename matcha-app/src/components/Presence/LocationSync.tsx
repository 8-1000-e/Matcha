"use client";

import { useEffect } from "react";
import { getProfile, saveLocation } from "@/lib/profile/client";
import { LOCATION_SYNC_INTERVAL_MS, syncDue } from "@/lib/profile/locationSync";

const CHECK_INTERVAL_MS = 60 * 60 * 1000;

function refresh() {
	if (!("geolocation" in navigator)) {
		return;
	}

	void getProfile().then((result) => {
		if (!result.ok) {
			return;
		}
		const profile = result.data.profile;
		if (!profile.location_consent || !syncDue(profile.location_updated_at)) {
			return;
		}

		navigator.geolocation.getCurrentPosition(
			(position) => {
				void saveLocation({
					latitude: position.coords.latitude,
					longitude: position.coords.longitude,
				});
			},
			() => undefined,
			{ maximumAge: LOCATION_SYNC_INTERVAL_MS, timeout: 15000 },
		);
	});
}

export function LocationSync() {
	useEffect(() => {
		refresh();
		const timer = window.setInterval(refresh, CHECK_INTERVAL_MS);
		return () => window.clearInterval(timer);
	}, []);

	return null;
}
