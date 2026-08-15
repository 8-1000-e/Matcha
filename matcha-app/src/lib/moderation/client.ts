import { REPORT_REASONS, type ReportReason } from "@/lib/db/types";
import { request, send, type ApiResult } from "@/lib/http/client";
import type { UserSummary } from "@/lib/profile/summary";

export interface BlockedUser extends UserSummary {
	blocked_at: string;
}

export const REPORT_LABELS: Record<ReportReason, string> = {
	fake_account: "Faux compte",
	harassment: "Harcèlement",
	scam: "Arnaque",
	inappropriate_behavior: "Comportement déplacé",
	inappropriate_content: "Contenu déplacé",
	identity_theft: "Usurpation d’identité",
};

export const REPORT_CHOICES: readonly ReportReason[] = REPORT_REASONS;

export function blockUser(userId: string): Promise<ApiResult<{ created: boolean }>> {
	return request<{ created: boolean }>(
		`/api/users/${encodeURIComponent(userId)}/block`,
		{ method: "PUT" },
	);
}

export function unblockUser(
	userId: string,
): Promise<ApiResult<{ removed: boolean }>> {
	return request<{ removed: boolean }>(
		`/api/users/${encodeURIComponent(userId)}/block`,
		{ method: "DELETE" },
	);
}

export function listBlocked(): Promise<ApiResult<{ blocked: BlockedUser[] }>> {
	return request<{ blocked: BlockedUser[] }>("/api/blocks", { method: "GET" });
}

export function reportUser(
	userId: string,
	reason: ReportReason,
): Promise<ApiResult<{ reason: ReportReason }>> {
	return send<{ reason: ReportReason }>(
		"POST",
		`/api/users/${encodeURIComponent(userId)}/report`,
		{ reason },
	);
}
