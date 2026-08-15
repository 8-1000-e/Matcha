import { request, type ApiResult } from "@/lib/http/client";

export interface Candidate {
	id: string;
	username: string;
	first_name: string;
	last_name: string;
	age: number;
	gender: string | null;
	orientation: string;
	biography: string | null;
	city: string | null;
	neighborhood: string | null;
	distance_km: number | null;
	common_tags: number;
	review_average: number;
	review_count: number;
	photo_count: number;
	profile_photo_path: string | null;
	profile_photo_id: string | null;
	photo_ids: string | null;
	tags: string | null;
	viewer_liked?: number;
	is_online: number;
	last_seen_at: string | null;
}

export interface FeedFilters {
	ageMin?: number;
	ageMax?: number;
	ratingMin?: number;
	maxDistanceKm?: number;
	tags?: number[];
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
