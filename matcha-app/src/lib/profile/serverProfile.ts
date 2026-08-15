import { serverFetch, serverFetchRaw } from "@/lib/http/serverFetch";
import type { Profile } from "./client";
import type { PublicProfilePayload } from "./public";
import type { ReviewPayload } from "./publicClient";

export type PublicProfileResult =
	| { status: "ok"; profile: PublicProfilePayload }
	| { status: "blocked"; by: "me" | "them" }
	| { status: "missing" };

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
): Promise<PublicProfileResult> {
	const response = await serverFetchRaw(`/api/users/${encodeURIComponent(id)}`);
	if (response === null) {
		return { status: "missing" };
	}

	const payload = (await response.json().catch(() => null)) as {
		profile?: PublicProfilePayload;
		code?: string;
	} | null;

	if (response.status === 403 && payload?.code !== undefined) {
		return {
			status: "blocked",
			by: payload.code === "blocked_by_me" ? "me" : "them",
		};
	}

	if (!response.ok || payload?.profile === undefined) {
		return { status: "missing" };
	}

	return { status: "ok", profile: payload.profile };
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
