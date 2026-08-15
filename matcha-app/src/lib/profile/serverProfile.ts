import { serverFetch } from "@/lib/http/serverFetch";
import type { Profile } from "./client";
import type { PublicProfilePayload } from "./public";
import type { ReviewPayload } from "./publicClient";

export async function fetchProfile(): Promise<Profile | null> {
	const response = await serverFetch("/api/profile");
	if (!response) {
		return null;
	}

	const payload = (await response.json()) as { profile?: Profile };
	return payload.profile ?? null;
}

export async function fetchPublicProfileOnServer(
	id: string,
): Promise<PublicProfilePayload | null> {
	const response = await serverFetch(`/api/users/${id}`);
	if (!response) {
		return null;
	}

	const payload = (await response.json()) as {
		profile?: PublicProfilePayload;
	};
	return payload.profile ?? null;
}

export async function fetchReviewsOnServer(
	id: string,
): Promise<ReviewPayload[]> {
	const response = await serverFetch(`/api/users/${id}/reviews`);
	if (!response) {
		return [];
	}

	const payload = (await response.json()) as { reviews?: ReviewPayload[] };
	return payload.reviews ?? [];
}
