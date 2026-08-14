import type { MessageRow } from "@/lib/db";

export interface MessagePayload {
	id: string;
	match_id: string;
	sender_id: string;
	body: string;
	sent_at: string;
	read: boolean;
}

export function serializeMessage(row: MessageRow): MessagePayload {
	return {
		id: row.id,
		match_id: row.match_id,
		sender_id: row.sender_id,
		body: row.body,
		sent_at: row.sent_at,
		read: row.read_at !== null,
	};
}
