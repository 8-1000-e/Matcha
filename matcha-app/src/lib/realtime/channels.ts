export function userChannel(userId: string): string {
	return `private-user-${userId}`;
}

export function chatChannel(matchId: string): string {
	return `private-chat-${matchId}`;
}

export function presenceUserChannel(userId: string): string {
	return `presence-user-${userId}`;
}
