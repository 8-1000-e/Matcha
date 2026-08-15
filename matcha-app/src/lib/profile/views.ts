import { request, type ApiResult } from "@/lib/http/client";
import type { UserSummary } from "./summary";

export interface ProfileView extends UserSummary {
	viewed_at: string;
	visit_count?: number;
}

export interface Liker extends UserSummary {
	liked_at: string;
}

export interface Paged {
	page: number;
	pages: number;
	total: number;
}

export function fetchLikers(
	scope: "received" | "sent",
	page = 1,
): Promise<ApiResult<Paged & { likers: Liker[] }>> {
	return request<Paged & { likers: Liker[] }>(
		`/api/likes?scope=${scope}&page=${page}`,
		{ method: "GET" },
	);
}

export function fetchViews(
	scope: "received" | "made",
	page = 1,
): Promise<ApiResult<Paged & { views: ProfileView[] }>> {
	return request<Paged & { views: ProfileView[] }>(
		`/api/views?scope=${scope}&page=${page}`,
		{ method: "GET" },
	);
}
