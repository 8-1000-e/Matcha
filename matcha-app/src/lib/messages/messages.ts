import { decryptMessage } from "@/lib/crypto/messages";
import type { CallStatus, MessageKind, MessageRow } from "@/lib/db";

export interface MessagePayload {
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

export function readBody(
	kind: MessageKind,
	body: string | null,
): string | null {
	return kind === "call" || body === null ? null : decryptMessage(body);
}

export function serializeMessage(row: MessageRow): MessagePayload {
	return {
		id: row.id,
		match_id: row.match_id,
		sender_id: row.sender_id,
		kind: row.kind,
		body: readBody(row.kind, row.body),
		call_status: row.call_status,
		call_duration_s: row.call_duration_s,
		sent_at: row.sent_at,
		read: row.read_at !== null,
	};
}
