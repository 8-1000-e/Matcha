import { request, type ApiResult } from "@/lib/http/client";
import type { CandidatePayload } from "./candidate";

export type Candidate = CandidatePayload;

export interface TagOption {
	id: number;
	label: string;
}

export interface FeedFilters {
	ageMin?: number;
	ageMax?: number;
	ratingMin?: number;
	maxDistanceKm?: number;
	city?: string;
	tags?: number[];
	tagMode?: "any" | "all";
	sort?: string;
	direction?: "asc" | "desc";
}

export interface FeedPayload {
	session: string;
	reset: boolean;
	items: Candidate[];
	next: number | null;
	total: number;
}

export function feedParams(
	filters: FeedFilters,
	sessionId: string | null,
	after: number,
): string {
	const params = new URLSearchParams();
	for (const [key, value] of Object.entries(filters)) {
		if (value === undefined || value === "") {
			continue;
		}
		params.set(key, Array.isArray(value) ? value.join(",") : String(value));
	}
	if (sessionId !== null) {
		params.set("session", sessionId);
	}
	if (after > 0) {
		params.set("after", String(after));
	}
	return params.toString();
}

export function fetchFeed(
	filters: FeedFilters,
	sessionId: string | null,
	after: number,
): Promise<ApiResult<FeedPayload>> {
	const query = feedParams(filters, sessionId, after);
	return request<FeedPayload>(`/api/discovery?${query}`, { method: "GET" });
}
