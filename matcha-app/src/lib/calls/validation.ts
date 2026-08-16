import { CALL_STATUSES, type CallStatus } from "@/lib/db";
import { isRecord, type Validated } from "@/lib/profile/validation";

export const SIGNAL_KINDS = ["offer", "answer", "ice"] as const;

export type SignalKind = (typeof SIGNAL_KINDS)[number];

const PAYLOAD_MAX = 16_000;

export interface SignalInput {
	callId: string;
	kind: SignalKind;
	payload: unknown;
}

export interface EndInput {
	callId: string;
	status: CallStatus;
}

function identifier(value: unknown): string | null {
	return typeof value === "string" && value.length > 0 && value.length <= 64
		? value
		: null;
}

export function validateSignal(body: unknown): Validated<SignalInput> {
	if (!isRecord(body)) {
		return { ok: false, errors: ["invalid request body"] };
	}

	const callId = identifier(body.call_id);
	if (callId === null) {
		return { ok: false, errors: ["call_id is invalid"] };
	}

	const kind = body.kind;
	if (
		typeof kind !== "string"
		|| !SIGNAL_KINDS.includes(kind as SignalKind)
	) {
		return { ok: false, errors: ["kind is invalid"] };
	}

	const payload = body.payload;
	if (!isRecord(payload)) {
		return { ok: false, errors: ["payload is invalid"] };
	}
	if (JSON.stringify(payload).length > PAYLOAD_MAX) {
		return { ok: false, errors: ["payload is too large"] };
	}

	return { ok: true, value: { callId, kind: kind as SignalKind, payload } };
}

export function validateEnd(body: unknown): Validated<EndInput> {
	if (!isRecord(body)) {
		return { ok: false, errors: ["invalid request body"] };
	}

	const callId = identifier(body.call_id);
	if (callId === null) {
		return { ok: false, errors: ["call_id is invalid"] };
	}

	const status = body.status;
	if (
		typeof status !== "string"
		|| !CALL_STATUSES.includes(status as CallStatus)
	) {
		return { ok: false, errors: ["status is invalid"] };
	}

	return { ok: true, value: { callId, status: status as CallStatus } };
}
