import { after } from "next/server";
import {
	notify,
	users,
	type NotificationInsert,
	type NotificationRow,
} from "@/lib/db";
import { publish, userChannel } from "@/lib/realtime/server";
import { conversationLink, serializeNotification } from "./notifications";

function push(row: NotificationRow): void {
	after(() => {
		const actor
			= row.actor_id === null ? undefined : users.findById(row.actor_id);
		publish(
			userChannel(row.recipient_id),
			"notification",
			serializeNotification(row, actor?.username ?? null),
		);
	});
}

export function emit(values: NotificationInsert): void {
	const row = notify(values);
	if (row !== undefined) {
		push(row);
	}
}

export function emitLiked(recipientId: string, actorId: string): void {
	emit({ recipient_id: recipientId, actor_id: actorId, type: "LIKED" });
}

export function emitMatch(
	recipientId: string,
	actorId: string,
	matchId: string,
): void {
	emit({
		recipient_id: recipientId,
		actor_id: actorId,
		type: "MATCH",
		link: conversationLink(matchId),
	});
}

export function emitUnliked(recipientId: string, actorId: string): void {
	emit({ recipient_id: recipientId, actor_id: actorId, type: "UNLIKED" });
}

export function emitViewed(recipientId: string, actorId: string): void {
	emit({ recipient_id: recipientId, actor_id: actorId, type: "VIEWED" });
}

export function emitMissedCall(
	recipientId: string,
	actorId: string,
	matchId: string,
): void {
	emit({
		recipient_id: recipientId,
		actor_id: actorId,
		type: "MISSED_CALL",
		link: conversationLink(matchId),
	});
}

export function emitMessage(
	recipientId: string,
	actorId: string,
	matchId: string,
): void {
	emit({
		recipient_id: recipientId,
		actor_id: actorId,
		type: "MESSAGE",
		link: conversationLink(matchId),
	});
}
