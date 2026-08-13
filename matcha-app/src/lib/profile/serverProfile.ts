import { serverFetch } from "@/lib/http/serverFetch";
import type { Profile } from "./client";

export async function fetchProfile(): Promise<Profile | null> {
	const response = await serverFetch("/api/profile");
	if (!response) {
		return null;
	}

	const payload = (await response.json()) as { profile?: Profile };
	return payload.profile ?? null;
}
