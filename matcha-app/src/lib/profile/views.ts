import { request, type ApiResult } from "@/lib/http/client";
import type { UserSummary } from "./summary";

export interface ProfileView extends UserSummary {
	viewed_at: string;
	visit_count?: number;
}

export interface Liker extends UserSummary {
	liked_at: string;
}

export function fetchLikers(
	scope: "received" | "sent",
): Promise<ApiResult<{ likers: Liker[] }>> {
	return request<{ likers: Liker[] }>(`/api/likes?scope=${scope}`, {
		method: "GET",
	});
}

export function fetchViews(
	scope: "received" | "made",
): Promise<ApiResult<{ views: ProfileView[] }>> {
	return request<{ views: ProfileView[] }>(`/api/views?scope=${scope}`, {
		method: "GET",
	});
}
