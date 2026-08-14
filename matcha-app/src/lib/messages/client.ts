import { request, send, type ApiResult } from "@/lib/http/client";

export const PAGE_SIZE = 30;

export interface Partner {
	id: string;
	username: string;
	first_name: string;
	age: number;
	city: string | null;
	photo_url: string | null;
	is_online: boolean;
	last_seen_at: string | null;
}

export interface LastMessage {
	body: string;
	sent_at: string;
	mine: boolean;
}

export interface Conversation {
	match_id: string;
	connected_at: string;
	unread: number;
	partner: Partner | null;
	last_message: LastMessage | null;
}

export interface ChatMessage {
	id: string;
	match_id: string;
	sender_id: string;
	body: string;
	sent_at: string;
	read: boolean;
}

export function getConversations(): Promise<
	ApiResult<{ matches: Conversation[] }>
	> {
	return request<{ matches: Conversation[] }>("/api/matches", {
		method: "GET",
	});
}

export function getMessages(
	matchId: string,
	before?: string,
): Promise<ApiResult<{ messages: ChatMessage[] }>> {
	const query = new URLSearchParams({ limit: String(PAGE_SIZE) });
	if (before !== undefined) {
		query.set("before", before);
	}
	return request<{ messages: ChatMessage[] }>(
		`/api/messages/${encodeURIComponent(matchId)}?${query.toString()}`,
		{ method: "GET" },
	);
}

export function postMessage(
	matchId: string,
	body: string,
): Promise<ApiResult<{ message: ChatMessage }>> {
	return send<{ message: ChatMessage }>(
		"POST",
		`/api/messages/${encodeURIComponent(matchId)}`,
		{ body },
	);
}

export function markConversationRead(
	matchId: string,
): Promise<ApiResult<{ updated: number }>> {
	return send<{ updated: number }>(
		"PATCH",
		`/api/messages/${encodeURIComponent(matchId)}`,
		{ read: true },
	);
}
