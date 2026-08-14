"use client";

import Pusher from "pusher-js";

let client: Pusher | null | undefined;

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
	const swallow = () => undefined;
	subscription.bind(event, handler);
	subscription.bind("pusher:subscription_error", swallow);
	return () => {
		subscription.unbind(event, handler);
		subscription.unbind("pusher:subscription_error", swallow);
		pusher.unsubscribe(channel);
	};
}
