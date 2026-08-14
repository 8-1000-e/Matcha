import { REPORT_REASONS, type ReportReason } from "@/lib/db/types";
import { request, send, type ApiResult } from "@/lib/http/client";

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
