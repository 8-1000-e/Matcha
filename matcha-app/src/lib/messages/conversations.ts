import { CONVERSATION_PAGE_SIZE, type Conversation } from "./client";

export function recent(left: Conversation, right: Conversation): number {
	return left.activity_at === right.activity_at
		? right.match_id.localeCompare(left.match_id)
		: right.activity_at.localeCompare(left.activity_at);
}

export function refreshHead(
	current: Conversation[],
	head: Conversation[],
): Conversation[] {
	const incoming = new Set(head.map((entry) => entry.match_id));
	const floor
		= head.length < CONVERSATION_PAGE_SIZE ? null : head[head.length - 1];

	const kept
		= floor === undefined || floor === null
			? []
			: current.filter(
				(entry) =>
					!incoming.has(entry.match_id) && recent(entry, floor) > 0,
			);

	return [...head, ...kept].sort(recent);
}

export function append(
	current: Conversation[],
	older: Conversation[],
): Conversation[] {
	const known = new Set(current.map((entry) => entry.match_id));
	return [
		...current,
		...older.filter((entry) => !known.has(entry.match_id)),
	].sort(recent);
}
