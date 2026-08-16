import type { CallStatus } from "@/lib/db";
import { request, send, type ApiResult } from "@/lib/http/client";
import type { ChatMessage } from "@/lib/messages/client";
import type { IceServer } from "./ice";
import type { SignalKind } from "./validation";

export interface IceConfig {
	user_id: string;
	channel: string;
	ice_servers: IceServer[];
	ring_timeout_ms: number;
}

export interface OpenedCall {
	call_id: string;
	ring_timeout_ms: number;
}

export function getIceConfig(): Promise<ApiResult<IceConfig>> {
	return request<IceConfig>("/api/calls/ice", { method: "GET" });
}

export function openCall(matchId: string): Promise<ApiResult<OpenedCall>> {
	return send<OpenedCall>(
		"POST",
		`/api/calls/${encodeURIComponent(matchId)}`,
		{},
	);
}

export function sendSignal(
	matchId: string,
	callId: string,
	kind: SignalKind,
	payload: unknown,
): Promise<ApiResult<{ ok: true }>> {
	return send<{ ok: true }>(
		"POST",
		`/api/calls/${encodeURIComponent(matchId)}/signal`,
		{ call_id: callId, kind, payload },
	);
}

export function endCall(
	matchId: string,
	callId: string,
	status: CallStatus,
): Promise<ApiResult<{ message: ChatMessage }>> {
	return send<{ message: ChatMessage }>(
		"POST",
		`/api/calls/${encodeURIComponent(matchId)}/end`,
		{ call_id: callId, status },
	);
}
