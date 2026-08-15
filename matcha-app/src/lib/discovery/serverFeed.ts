import type { FeedPayload } from "@/lib/discovery/client";
import { serverFetch } from "@/lib/http/serverFetch";

export async function fetchInitialFeed(): Promise<FeedPayload | null> {
	const response = await serverFetch("/api/discovery");
	if (!response) {
		return null;
	}

	return (await response.json()) as FeedPayload;
}
