import { execute, queryAll, queryScalar } from "../core/client";
import { boundedInteger } from "../core/identifiers";
import { createRepository } from "../core/repository";
import { sql } from "../core/sql";
import { createId, nowIso } from "../core/values";
import type { NotificationInsert, NotificationRow } from "../types";

export const notifications = createRepository<
	NotificationRow,
	NotificationInsert
>({
	table: "notifications",
	columns: [
		"id",
		"recipient_id",
		"actor_id",
		"type",
		"link",
		"created_at",
		"read_at",
	],
	defaultOrder: [{ column: "created_at", direction: "desc" }],
});

export function notify(
	values: NotificationInsert,
): NotificationRow | undefined {
	if (
		values.actor_id !== undefined
		&& values.actor_id !== null
		&& queryScalar<number>(
			sql`SELECT 1 FROM blocks
				WHERE (blocks.blocker_id = ${values.recipient_id}
						AND blocks.blocked_id = ${values.actor_id})
					OR (blocks.blocker_id = ${values.actor_id}
						AND blocks.blocked_id = ${values.recipient_id})
				LIMIT 1`,
		) === 1
	) {
		return undefined;
	}
	return notifications.insert({ ...values, id: values.id ?? createId() });
}

export function listNotifications(
	recipientId: string,
	options?: { unreadOnly?: boolean; limit?: number },
): (NotificationRow & { actor_username: string | null })[] {
	const limit = boundedInteger(options?.limit ?? 50, 1, 200, "limit");
	return queryAll<NotificationRow & { actor_username: string | null }>(
		sql`SELECT notifications.*, users.username AS actor_username
			FROM notifications
			LEFT JOIN users ON users.id = notifications.actor_id
			WHERE notifications.recipient_id = ${recipientId}
				AND (${options?.unreadOnly === true ? 1 : 0} = 0
					OR notifications.read_at IS NULL)
			ORDER BY notifications.created_at DESC
			LIMIT ${limit}`,
	);
}

export function countUnreadNotifications(recipientId: string): number {
	return (
		queryScalar<number>(
			sql`SELECT COUNT(*) FROM notifications
				WHERE recipient_id = ${recipientId} AND read_at IS NULL`,
		) ?? 0
	);
}

export function markNotificationRead(
	recipientId: string,
	notificationId: string,
): boolean {
	return (
		execute(
			sql`UPDATE notifications SET read_at = ${nowIso()}
				WHERE id = ${notificationId}
					AND recipient_id = ${recipientId}
					AND read_at IS NULL`,
		).changes === 1
	);
}

export function markAllNotificationsRead(recipientId: string): number {
	return execute(
		sql`UPDATE notifications SET read_at = ${nowIso()}
			WHERE recipient_id = ${recipientId} AND read_at IS NULL`,
	).changes;
}
