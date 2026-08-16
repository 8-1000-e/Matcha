import type { CallStatus, MessageKind } from "@/lib/db";
import { request, send, type ApiResult } from "@/lib/http/client";

export const PAGE_SIZE = 30;
export const CONVERSATION_PAGE_SIZE = 15;

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
	kind: MessageKind;
	body: string | null;
	call_status: CallStatus | null;
	call_duration_s: number | null;
	sent_at: string;
	mine: boolean;
}

export interface Conversation {
	match_id: string;
	connected_at: string;
	activity_at: string;
	unread: number;
	partner: Partner | null;
	last_message: LastMessage | null;
}

export interface ConversationCursor {
	activity_at: string;
	id: string;
}

export interface ConversationList {
	matches: Conversation[];
	cursor: ConversationCursor | null;
	unread_messages: number;
}

export interface ChatMessage {
	id: string;
	match_id: string;
	sender_id: string;
	kind: MessageKind;
	body: string | null;
	call_status: CallStatus | null;
	call_duration_s: number | null;
	sent_at: string;
	read: boolean;
}

export function getConversations(options?: {
	search?: string;
	before?: ConversationCursor;
}): Promise<ApiResult<ConversationList>> {
	const query = new URLSearchParams({
		limit: String(CONVERSATION_PAGE_SIZE),
	});
	if (options?.search !== undefined && options.search.length > 0) {
		query.set("q", options.search);
	}
	if (options?.before !== undefined) {
		query.set("before", options.before.activity_at);
		query.set("before_id", options.before.id);
	}
	return request<ConversationList>(`/api/matches?${query.toString()}`, {
		method: "GET",
	});
}

export interface Thread {
	partner: Partner | null;
	partner_deleted: boolean;
	messages: ChatMessage[];
}

export function getMessages(
	matchId: string,
	before?: string,
): Promise<ApiResult<Thread>> {
	const query = new URLSearchParams({ limit: String(PAGE_SIZE) });
	if (before !== undefined) {
		query.set("before", before);
	}
	return request<Thread>(
		`/api/messages/${encodeURIComponent(matchId)}?${query.toString()}`,
		{ method: "GET" },
	);
}

export function getPartner(matchId: string): Promise<ApiResult<Thread>> {
	return request<Thread>(
		`/api/messages/${encodeURIComponent(matchId)}?limit=1`,
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
