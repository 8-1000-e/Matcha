import { request, type ApiResult } from "@/lib/http/client";
import type { UserSummary } from "./summary";

export interface ProfileView extends UserSummary {
	viewed_at: string;
	visit_count?: number;
}

export function fetchViews(
	scope: "received" | "made",
): Promise<ApiResult<{ views: ProfileView[] }>> {
	return request<{ views: ProfileView[] }>(`/api/views?scope=${scope}`, {
		method: "GET",
	});
}
