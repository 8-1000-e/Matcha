import { execute, queryAll, queryOne } from "../core/client";
import { createRepository } from "../core/repository";
import { sql } from "../core/sql";
import { createId, nowIso } from "../core/values";
import type { EventInsert, EventRow, EventStatus } from "../types";

export const events = createRepository<EventRow, EventInsert>({
	table: "events",
	columns: [
		"id",
		"match_id",
		"organiser_id",
		"guest_id",
		"title",
		"location",
		"starts_at",
		"ends_at",
		"google_event_id",
		"status",
		"created_at",
		"updated_at",
	],
	defaultOrder: [{ column: "starts_at", direction: "asc" }],
});

export function createEvent(values: EventInsert): EventRow {
	return events.insert({ ...values, id: values.id ?? createId() });
}

export function findEvent(id: string, matchId: string): EventRow | undefined {
	return queryOne<EventRow>(
		sql`SELECT * FROM events WHERE id = ${id} AND match_id = ${matchId}`,
	);
}

export function listEvents(matchId: string): EventRow[] {
	return queryAll<EventRow>(
		sql`SELECT * FROM events
			WHERE match_id = ${matchId}
			ORDER BY starts_at`,
	);
}

export function listUpcomingEvents(userId: string): EventRow[] {
	return queryAll<EventRow>(
		sql`SELECT * FROM events
			WHERE (organiser_id = ${userId} OR guest_id = ${userId})
				AND status = 'planned'
				AND ends_at >= ${nowIso()}
			ORDER BY starts_at`,
	);
}

export function updateEvent(
	id: string,
	values: Partial<Omit<EventInsert, "id" | "match_id">>,
): EventRow | undefined {
	return events.updateById(id, { ...values, updated_at: nowIso() });
}

export function setEventStatus(id: string, status: EventStatus): boolean {
	return (
		execute(
			sql`UPDATE events SET status = ${status}, updated_at = ${nowIso()}
				WHERE id = ${id} AND status <> ${status}`,
		).changes === 1
	);
}

export function setGoogleEventId(id: string, googleEventId: string | null): void {
	execute(
		sql`UPDATE events SET google_event_id = ${googleEventId}, updated_at = ${nowIso()}
			WHERE id = ${id}`,
	);
}
