import { randomUUID } from "node:crypto";

export const RING_TIMEOUT_MS = 30_000;

const RINGING_MAX_MS = RING_TIMEOUT_MS * 2;
const ANSWERED_MAX_MS = 4 * 60 * 60 * 1000;

export interface ActiveCall {
	id: string;
	match_id: string;
	caller_id: string;
	callee_id: string;
	started_at: number;
	answered_at: number | null;
}

const store = globalThis as typeof globalThis & {
	matchaCalls?: Map<string, ActiveCall>;
};

function registry(): Map<string, ActiveCall> {
	store.matchaCalls ??= new Map<string, ActiveCall>();
	return store.matchaCalls;
}

function prune(): void {
	const now = Date.now();
	for (const [id, call] of registry()) {
		const since = now - (call.answered_at ?? call.started_at);
		const limit = call.answered_at === null ? RINGING_MAX_MS : ANSWERED_MAX_MS;
		if (since > limit) {
			registry().delete(id);
		}
	}
}

export function findBusyCall(userId: string): ActiveCall | undefined {
	prune();
	for (const call of registry().values()) {
		if (call.caller_id === userId || call.callee_id === userId) {
			return call;
		}
	}
	return undefined;
}

export function openCall(
	matchId: string,
	callerId: string,
	calleeId: string,
): ActiveCall {
	const call: ActiveCall = {
		id: randomUUID(),
		match_id: matchId,
		caller_id: callerId,
		callee_id: calleeId,
		started_at: Date.now(),
		answered_at: null,
	};
	registry().set(call.id, call);
	return call;
}

export function findCall(callId: string): ActiveCall | undefined {
	prune();
	return registry().get(callId);
}

export function isPeer(call: ActiveCall, userId: string): boolean {
	return call.caller_id === userId || call.callee_id === userId;
}

export function answerCall(callId: string): ActiveCall | undefined {
	const call = registry().get(callId);
	if (call === undefined) {
		return undefined;
	}
	call.answered_at ??= Date.now();
	return call;
}

export function closeCall(callId: string): ActiveCall | undefined {
	const call = registry().get(callId);
	registry().delete(callId);
	return call;
}

export function elapsedSeconds(call: ActiveCall): number | null {
	if (call.answered_at === null) {
		return null;
	}
	return Math.max(0, Math.round((Date.now() - call.answered_at) / 1000));
}
