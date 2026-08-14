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

function release(pusher: Pusher, channel: string): void {
	const left = (listeners.get(channel) ?? 1) - 1;
	if (left > 0) {
		listeners.set(channel, left);
		return;
	}
	listeners.delete(channel);
	pusher.unsubscribe(channel);
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
