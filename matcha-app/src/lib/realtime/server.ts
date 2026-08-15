import Pusher from "pusher";

let client: Pusher | null | undefined;

function realtime(): Pusher | null {
	if (client !== undefined) {
		return client;
	}
	const appId = process.env.PUSHER_APP_ID;
	const key = process.env.PUSHER_KEY;
	const secret = process.env.PUSHER_SECRET;
	const cluster = process.env.PUSHER_CLUSTER;
	if (!appId || !key || !secret || !cluster) {
		client = null;
		return client;
	}
	client = new Pusher({ appId, key, secret, cluster, useTLS: true });
	return client;
}

export function userChannel(userId: string): string {
	return `private-user-${userId}`;
}

export function chatChannel(matchId: string): string {
	return `private-chat-${matchId}`;
}

export function publish(
	channel: string,
	event: string,
	payload: unknown,
): void {
	const pusher = realtime();
	if (pusher === null) {
		return;
	}
	pusher.trigger(channel, event, payload).catch((error: unknown) => {
		console.error("realtime publish failed", error);
	});
}

export function authorizeChannel(
	socketId: string,
	channel: string,
): Pusher.ChannelAuthResponse | null {
	const pusher = realtime();
	if (pusher === null) {
		return null;
	}
	return pusher.authorizeChannel(socketId, channel);
}
