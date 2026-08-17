import { queryAll, queryOne } from "../core/client";
import { sql } from "../core/sql";

export interface ExportedAccount {
	id: string;
	email: string;
	username: string;
	first_name: string;
	last_name: string;
	birth_date: string;
	gender: string | null;
	orientation: string;
	biography: string | null;
	city: string | null;
	neighborhood: string | null;
	latitude: number | null;
	longitude: number | null;
	location_consent: number;
	location_updated_at: string | null;
	is_verified: number;
	profile_completed: number;
	has_password: number;
	last_seen_at: string | null;
	created_at: string;
	deleted_at: string | null;
}

export interface ExportedMessage {
	match_id: string;
	partner_username: string;
	direction: string;
	kind: string;
	body: string | null;
	call_status: string | null;
	call_duration_s: number | null;
	sent_at: string;
	read_at: string | null;
}

export function exportAccount(userId: string): ExportedAccount | undefined {
	return queryOne<ExportedAccount>(
		sql`SELECT id, email, username, first_name, last_name, birth_date, gender,
				orientation, biography, city, neighborhood, latitude, longitude,
				location_consent, location_updated_at, is_verified, profile_completed,
				has_password, last_seen_at, created_at, deleted_at
			FROM users WHERE id = ${userId}`,
	);
}

export function exportTags(userId: string): { label: string }[] {
	return queryAll<{ label: string }>(
		sql`SELECT tags.label
			FROM user_tags
			JOIN tags ON tags.id = user_tags.tag_id
			WHERE user_tags.user_id = ${userId}
			ORDER BY tags.label`,
	);
}

export function exportPhotos(userId: string): Record<string, unknown>[] {
	return queryAll<Record<string, unknown>>(
		sql`SELECT id, is_profile, position, created_at
			FROM photos WHERE user_id = ${userId}
			ORDER BY position`,
	);
}

export function exportLikesGiven(userId: string): Record<string, unknown>[] {
	return queryAll<Record<string, unknown>>(
		sql`SELECT users.username AS liked_username, likes.liked_at
			FROM likes
			JOIN users ON users.id = likes.liked_id
			WHERE likes.liker_id = ${userId}
			ORDER BY likes.liked_at DESC`,
	);
}

export function exportLikesReceived(userId: string): Record<string, unknown>[] {
	return queryAll<Record<string, unknown>>(
		sql`SELECT users.username AS liker_username, likes.liked_at
			FROM likes
			JOIN users ON users.id = likes.liker_id
			WHERE likes.liked_id = ${userId}
			ORDER BY likes.liked_at DESC`,
	);
}

export function exportViewsMade(userId: string): Record<string, unknown>[] {
	return queryAll<Record<string, unknown>>(
		sql`SELECT users.username AS viewed_username, profile_views.viewed_at
			FROM profile_views
			JOIN users ON users.id = profile_views.viewed_id
			WHERE profile_views.viewer_id = ${userId}
			ORDER BY profile_views.viewed_at DESC`,
	);
}

export function exportViewsReceived(userId: string): Record<string, unknown>[] {
	return queryAll<Record<string, unknown>>(
		sql`SELECT users.username AS viewer_username, profile_views.viewed_at
			FROM profile_views
			JOIN users ON users.id = profile_views.viewer_id
			WHERE profile_views.viewed_id = ${userId}
			ORDER BY profile_views.viewed_at DESC`,
	);
}

export function exportMatches(userId: string): Record<string, unknown>[] {
	return queryAll<Record<string, unknown>>(
		sql`SELECT matches.id, users.username AS partner_username,
				matches.connected_at, matches.is_active
			FROM matches
			JOIN users ON users.id = CASE
				WHEN matches.user_a_id = ${userId} THEN matches.user_b_id
				ELSE matches.user_a_id END
			WHERE matches.user_a_id = ${userId} OR matches.user_b_id = ${userId}
			ORDER BY matches.connected_at DESC`,
	);
}

export function exportMessages(userId: string): ExportedMessage[] {
	return queryAll<ExportedMessage>(
		sql`SELECT messages.match_id, users.username AS partner_username,
				CASE WHEN messages.sender_id = ${userId} THEN 'sent' ELSE 'received' END
					AS direction,
				messages.kind, messages.body, messages.call_status,
				messages.call_duration_s, messages.sent_at, messages.read_at
			FROM messages
			JOIN matches ON matches.id = messages.match_id
			JOIN users ON users.id = CASE
				WHEN matches.user_a_id = ${userId} THEN matches.user_b_id
				ELSE matches.user_a_id END
			WHERE matches.user_a_id = ${userId} OR matches.user_b_id = ${userId}
			ORDER BY messages.sent_at`,
	);
}

export function exportEvents(userId: string): Record<string, unknown>[] {
	return queryAll<Record<string, unknown>>(
		sql`SELECT events.id, events.title, events.location, events.starts_at,
				events.ends_at, events.status, events.created_at,
				CASE WHEN events.organiser_id = ${userId} THEN 'organiser' ELSE 'guest' END
					AS role,
				users.username AS partner_username
			FROM events
			JOIN users ON users.id = CASE
				WHEN events.organiser_id = ${userId} THEN events.guest_id
				ELSE events.organiser_id END
			WHERE events.organiser_id = ${userId} OR events.guest_id = ${userId}
			ORDER BY events.starts_at`,
	);
}

export function exportReviewsWritten(userId: string): Record<string, unknown>[] {
	return queryAll<Record<string, unknown>>(
		sql`SELECT users.username AS target_username, reviews.score, reviews.body,
				reviews.created_at, reviews.updated_at
			FROM reviews
			JOIN users ON users.id = reviews.target_id
			WHERE reviews.author_id = ${userId}
			ORDER BY reviews.created_at DESC`,
	);
}

export function exportReviewsReceived(userId: string): Record<string, unknown>[] {
	return queryAll<Record<string, unknown>>(
		sql`SELECT users.username AS author_username, reviews.score, reviews.body,
				reviews.created_at, reviews.updated_at
			FROM reviews
			JOIN users ON users.id = reviews.author_id
			WHERE reviews.target_id = ${userId}
			ORDER BY reviews.created_at DESC`,
	);
}

export function exportBlocks(userId: string): Record<string, unknown>[] {
	return queryAll<Record<string, unknown>>(
		sql`SELECT users.username AS blocked_username, blocks.blocked_at
			FROM blocks
			JOIN users ON users.id = blocks.blocked_id
			WHERE blocks.blocker_id = ${userId}
			ORDER BY blocks.blocked_at DESC`,
	);
}

export function exportReports(userId: string): Record<string, unknown>[] {
	return queryAll<Record<string, unknown>>(
		sql`SELECT users.username AS reported_username, reports.reason,
				reports.reported_at
			FROM reports
			JOIN users ON users.id = reports.reported_id
			WHERE reports.reporter_id = ${userId}
			ORDER BY reports.reported_at DESC`,
	);
}

export function exportNotifications(userId: string): Record<string, unknown>[] {
	return queryAll<Record<string, unknown>>(
		sql`SELECT notifications.type, users.username AS actor_username,
				notifications.created_at, notifications.read_at
			FROM notifications
			LEFT JOIN users ON users.id = notifications.actor_id
			WHERE notifications.recipient_id = ${userId}
			ORDER BY notifications.created_at DESC`,
	);
}

export function exportOAuthAccounts(userId: string): Record<string, unknown>[] {
	return queryAll<Record<string, unknown>>(
		sql`SELECT provider, email, linked_at
			FROM oauth_accounts WHERE user_id = ${userId}
			ORDER BY linked_at DESC`,
	);
}

export function exportSessions(userId: string): Record<string, unknown>[] {
	return queryAll<Record<string, unknown>>(
		sql`SELECT created_at, expires_at, revoked_at
			FROM refresh_tokens WHERE user_id = ${userId}
			ORDER BY created_at DESC`,
	);
}
