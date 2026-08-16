import type { EventRow } from "@/lib/db";

export interface SerializedEvent {
	id: string;
	organiser_id: string;
	guest_id: string;
	title: string;
	location: string | null;
	starts_at: string;
	ends_at: string;
	status: string;
	synced: boolean;
	created_at: string;
}

export function serializeEvent(event: EventRow): SerializedEvent {
	return {
		id: event.id,
		organiser_id: event.organiser_id,
		guest_id: event.guest_id,
		title: event.title,
		location: event.location,
		starts_at: event.starts_at,
		ends_at: event.ends_at,
		status: event.status,
		synced: event.google_event_id !== null,
		created_at: event.created_at,
	};
}
