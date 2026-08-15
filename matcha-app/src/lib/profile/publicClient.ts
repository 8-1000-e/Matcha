import { request, type ApiResult } from "@/lib/http/client";
import type { PublicProfilePayload } from "./public";

export interface ReviewPayload {
	id: string;
	author_id: string;
	author_username: string;
	score: number;
	body: string | null;
	created_at: string;
	updated_at: string;
}

export interface LikeOutcome {
	ok: boolean;
	liked: boolean;
	matched: boolean;
	match_id: string | null;
}

export interface UnlikeOutcome {
	ok: boolean;
	unliked: boolean;
	disconnected: boolean;
}

export function likeUser(id: string): Promise<ApiResult<LikeOutcome>> {
	return request<LikeOutcome>(`/api/users/${id}/like`, { method: "PUT" });
}

export function unlikeUser(id: string): Promise<ApiResult<UnlikeOutcome>> {
	return request<UnlikeOutcome>(`/api/users/${id}/like`, { method: "DELETE" });
}

export function recordView(id: string): Promise<ApiResult<{ ok: boolean }>> {
	return request<{ ok: boolean }>(`/api/users/${id}/view`, { method: "POST" });
}

export function fetchPublicProfile(
	id: string,
): Promise<ApiResult<{ ok: boolean; profile: PublicProfilePayload }>> {
	return request(`/api/users/${id}`, { method: "GET" });
}

export function fetchMyReviews(): Promise<
	ApiResult<{
		review_average: number;
		review_count: number;
		reviews: ReviewPayload[];
	}>
	> {
	return request("/api/profile/reviews", { method: "GET" });
}

export function fetchReviews(
	id: string,
): Promise<ApiResult<{ ok: boolean; reviews: ReviewPayload[] }>> {
	return request(`/api/users/${id}/reviews`, { method: "GET" });
}
