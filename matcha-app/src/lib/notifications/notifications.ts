import type { NotificationRow, NotificationType } from "@/lib/db";

export interface NotificationPayload {
	id: string;
	type: NotificationType;
	actor_id: string | null;
	actor_username: string | null;
	link: string | null;
	created_at: string;
	read: boolean;
}

export const UNKNOWN_ACTOR = "Quelqu’un";

export const NOTIFICATION_LABELS: Record<
	NotificationType,
	(actor: string) => string
> = {
	LIKED: (actor) => `${actor} vous a liké`,
	MATCH: (actor) => `${actor} vous a liké en retour, vous êtes connectés`,
	UNLIKED: (actor) => `${actor} a retiré son like`,
	VIEWED: (actor) => `${actor} a consulté votre profil`,
	MESSAGE: (actor) => `${actor} vous a envoyé un message`,
};

export function serializeNotification(
	row: NotificationRow,
	actorUsername: string | null,
): NotificationPayload {
	return {
		id: row.id,
		type: row.type,
		actor_id: row.actor_id,
		actor_username: actorUsername,
		link: row.link,
		created_at: row.created_at,
		read: row.read_at !== null,
	};
}
