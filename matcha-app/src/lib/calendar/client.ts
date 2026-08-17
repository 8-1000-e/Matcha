import { request, send, type ApiResult } from "@/lib/http/client";
import type { SerializedEvent } from "./events";

export type AppEvent = SerializedEvent;

export interface EventDraft {
	title: string;
	location: string | null;
	starts_at: string;
	ends_at: string;
}

export function getEvents(matchId: string): Promise<ApiResult<{ events: AppEvent[] }>> {
	return request<{ events: AppEvent[] }>(`/api/matches/${matchId}/events`, {
		method: "GET",
	});
}

export function proposeEvent(
	matchId: string,
	draft: EventDraft,
): Promise<ApiResult<{ event: AppEvent }>> {
	return send<{ event: AppEvent }>("POST", `/api/matches/${matchId}/events`, draft);
}

export function editEvent(
	matchId: string,
	eventId: string,
	draft: EventDraft,
): Promise<ApiResult<{ event: AppEvent; calendar_synced: boolean }>> {
	return send<{ event: AppEvent; calendar_synced: boolean }>(
		"PATCH",
		`/api/matches/${matchId}/events/${eventId}`,
		draft,
	);
}

export function cancelEvent(
	matchId: string,
	eventId: string,
): Promise<ApiResult<{ cancelled: boolean; calendar_synced: boolean }>> {
	return request<{ cancelled: boolean; calendar_synced: boolean }>(
		`/api/matches/${matchId}/events/${eventId}`,
		{ method: "DELETE" },
	);
}

export function splitLocal(iso: string): { date: string; time: string } {
	const value = new Date(iso);
	const shifted = new Date(value.getTime() - value.getTimezoneOffset() * 60_000);
	const local = shifted.toISOString();

	return { date: local.slice(0, 10), time: local.slice(11, 16) };
}

export function joinLocal(date: string, time: string): string {
	return new Date(`${date}T${time}`).toISOString();
}
