"use client";

import Pusher from "pusher-js";

let client: Pusher | null | undefined;
const listeners = new Map<string, number>();

function realtime(): Pusher | null {
	if (client !== undefined) {
		return client;
	}
	const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
	const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;
	if (!key || !cluster) {
		client = null;
		return client;
	}
	client = new Pusher(key, {
		cluster,
		authEndpoint: "/api/pusher/auth",
		forceTLS: true,
	});
	return client;
}

interface PresenceMember {
	id: string;
}

interface PresenceRoster {
	subscribed: boolean;
	members: { get: (id: string) => unknown };
}

function release(pusher: Pusher, channel: string): void {
	const left = (listeners.get(channel) ?? 1) - 1;
	if (left > 0) {
		listeners.set(channel, left);
		return;
	}
	listeners.delete(channel);
	pusher.unsubscribe(channel);
}

export function announcePresence(channel: string): () => void {
	const pusher = realtime();
	if (pusher === null) {
		return () => undefined;
	}

	const subscription = pusher.subscribe(channel);
	listeners.set(channel, (listeners.get(channel) ?? 0) + 1);

	const swallow = () => undefined;
	subscription.bind("pusher:subscription_error", swallow);

	let released = false;
	return () => {
		if (released) {
			return;
		}
		released = true;
		subscription.unbind("pusher:subscription_error", swallow);
		release(pusher, channel);
	};
}

export interface PresenceWatcher {
	onPresence: (present: boolean) => void;
	onDenied?: () => void;
}

export function watchPresence(
	channel: string,
	memberId: string,
	watcher: PresenceWatcher,
): () => void {
	const pusher = realtime();
	if (pusher === null) {
		return () => undefined;
	}

	const subscription = pusher.subscribe(channel);
	listeners.set(channel, (listeners.get(channel) ?? 0) + 1);

	const roster = subscription as unknown as PresenceRoster;
	const settle = () => {
		watcher.onPresence(roster.members.get(memberId) != null);
	};
	const joined = (payload: unknown) => {
		if ((payload as PresenceMember).id === memberId) {
			watcher.onPresence(true);
		}
	};
	const left = (payload: unknown) => {
		if ((payload as PresenceMember).id === memberId) {
			watcher.onPresence(false);
		}
	};
	const failed = (payload: unknown) => {
		if ((payload as { status?: number }).status === 403) {
			watcher.onDenied?.();
		}
	};

	subscription.bind("pusher:subscription_succeeded", settle);
	subscription.bind("pusher:member_added", joined);
	subscription.bind("pusher:member_removed", left);
	subscription.bind("pusher:subscription_error", failed);
	if (roster.subscribed) {
		settle();
	}

	let released = false;
	return () => {
		if (released) {
			return;
		}
		released = true;
		subscription.unbind("pusher:subscription_succeeded", settle);
		subscription.unbind("pusher:member_added", joined);
		subscription.unbind("pusher:member_removed", left);
		subscription.unbind("pusher:subscription_error", failed);
		release(pusher, channel);
	};
}

export function subscribe(
	channel: string,
	event: string,
	handler: (payload: unknown) => void,
): () => void {
	const pusher = realtime();
	if (pusher === null) {
		return () => undefined;
	}

	const subscription = pusher.subscribe(channel);
	listeners.set(channel, (listeners.get(channel) ?? 0) + 1);

	const swallow = () => undefined;
	subscription.bind(event, handler);
	subscription.bind("pusher:subscription_error", swallow);

	let released = false;
	return () => {
		if (released) {
			return;
		}
		released = true;
		subscription.unbind(event, handler);
		subscription.unbind("pusher:subscription_error", swallow);
		release(pusher, channel);
	};
}
