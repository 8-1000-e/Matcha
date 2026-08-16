import { request, type ApiResult } from "@/lib/http/client";

export interface LinkedAccount {
	provider: string;
	email: string | null;
	linked_at: string;
}

export function fetchLinkedAccounts(): Promise<ApiResult<{ accounts: LinkedAccount[] }>> {
	return request<{ accounts: LinkedAccount[] }>("/api/profile/oauth", { method: "GET" });
}

export function unlinkAccount(provider: string): Promise<ApiResult<{ removed: boolean }>> {
	return request<{ removed: boolean }>(`/api/profile/oauth/${provider}`, { method: "DELETE" });
}
