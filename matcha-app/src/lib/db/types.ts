import type { Flag } from "./core/values";

export const GENDERS = ["woman", "man", "non_binary", "other"] as const;
export const ORIENTATIONS = ["hetero", "homo", "bi", "pan", "other"] as const;
export const EMAIL_TOKEN_TYPES = [
	"email_verification",
	"password_reset",
] as const;
export const REPORT_REASONS = [
	"fake_account",
	"harassment",
	"scam",
	"inappropriate_behavior",
	"inappropriate_content",
	"identity_theft",
] as const;
export const NOTIFICATION_TYPES = [
	"LIKED",
	"VIEWED",
	"MESSAGE",
	"MATCH",
	"UNLIKED",
] as const;

export type Gender = (typeof GENDERS)[number];
export type Orientation = (typeof ORIENTATIONS)[number];
export type EmailTokenType = (typeof EMAIL_TOKEN_TYPES)[number];
export type ReportReason = (typeof REPORT_REASONS)[number];
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const MAX_PHOTOS_PER_USER = 5;
export const MINIMUM_TAGS = 3;

export interface UserRow {
	id: string;
	email: string;
	username: string;
	first_name: string;
	last_name: string;
	password_hash: string;
	birth_date: string;
	gender: Gender | null;
	orientation: Orientation;
	biography: string | null;
	is_verified: Flag;
	profile_completed: Flag;
	latitude: number | null;
	longitude: number | null;
	city: string | null;
	neighborhood: string | null;
	location_consent: Flag;
	is_online: Flag;
	last_seen_at: string | null;
	created_at: string;
}

export interface UserInsert {
	id?: string;
	email: string;
	username: string;
	first_name: string;
	last_name: string;
	password_hash: string;
	birth_date: string;
	gender?: Gender | null;
	orientation?: Orientation;
	biography?: string | null;
	is_verified?: Flag;
	profile_completed?: Flag;
	latitude?: number | null;
	longitude?: number | null;
	city?: string | null;
	neighborhood?: string | null;
	location_consent?: Flag;
	is_online?: Flag;
	last_seen_at?: string | null;
	created_at?: string;
}

export interface EmailTokenRow {
	id: string;
	user_id: string;
	token_hash: string;
	type: EmailTokenType;
	expires_at: string;
	used_at: string | null;
	created_at: string;
}

export interface EmailTokenInsert {
	id?: string;
	user_id: string;
	token_hash: string;
	type: EmailTokenType;
	expires_at: string;
	used_at?: string | null;
	created_at?: string;
}

export interface RefreshTokenRow {
	id: string;
	user_id: string;
	token_hash: string;
	expires_at: string;
	revoked_at: string | null;
	created_at: string;
}

export interface RefreshTokenInsert {
	id?: string;
	user_id: string;
	token_hash: string;
	expires_at: string;
	revoked_at?: string | null;
	created_at?: string;
}

export interface PhotoRow {
	id: string;
	user_id: string;
	path: string;
	is_profile: Flag;
	position: number;
	created_at: string;
}

export interface PhotoInsert {
	id?: string;
	user_id: string;
	path: string;
	is_profile?: Flag;
	position?: number;
	created_at?: string;
}

export interface TagRow {
	id: number;
	label: string;
}

export interface TagInsert {
	id?: number;
	label: string;
}

export interface UserTagRow {
	user_id: string;
	tag_id: number;
}

export interface ProfileViewRow {
	id: string;
	viewer_id: string;
	viewed_id: string;
	viewed_at: string;
}

export interface ProfileViewInsert {
	id?: string;
	viewer_id: string;
	viewed_id: string;
	viewed_at?: string;
}

export interface LikeRow {
	liker_id: string;
	liked_id: string;
	liked_at: string;
}

export interface LikeInsert {
	liker_id: string;
	liked_id: string;
	liked_at?: string;
}

export interface MatchRow {
	id: string;
	user_a_id: string;
	user_b_id: string;
	connected_at: string;
	is_active: Flag;
}

export interface MatchInsert {
	id?: string;
	user_a_id: string;
	user_b_id: string;
	connected_at?: string;
	is_active?: Flag;
}

export interface MessageRow {
	id: string;
	match_id: string;
	sender_id: string;
	body: string;
	sent_at: string;
	read_at: string | null;
}

export interface MessageInsert {
	id?: string;
	match_id: string;
	sender_id: string;
	body: string;
	sent_at?: string;
	read_at?: string | null;
}

export interface ReviewRow {
	id: string;
	author_id: string;
	target_id: string;
	score: number;
	body: string | null;
	created_at: string;
	updated_at: string;
}

export interface ReviewInsert {
	id?: string;
	author_id: string;
	target_id: string;
	score: number;
	body?: string | null;
	created_at?: string;
	updated_at?: string;
}

export interface BlockRow {
	blocker_id: string;
	blocked_id: string;
	blocked_at: string;
}

export interface BlockInsert {
	blocker_id: string;
	blocked_id: string;
	blocked_at?: string;
}

export interface ReportRow {
	id: string;
	reporter_id: string;
	reported_id: string;
	target_review_id: string | null;
	reason: ReportReason;
	reported_at: string;
}

export interface ReportInsert {
	id?: string;
	reporter_id: string;
	reported_id: string;
	target_review_id?: string | null;
	reason: ReportReason;
	reported_at?: string;
}

export interface NotificationRow {
	id: string;
	recipient_id: string;
	actor_id: string | null;
	type: NotificationType;
	link: string | null;
	created_at: string;
	read_at: string | null;
}

export interface NotificationInsert {
	id?: string;
	recipient_id: string;
	actor_id?: string | null;
	type: NotificationType;
	link?: string | null;
	created_at?: string;
	read_at?: string | null;
}

export interface PopularityRow {
	user_id: string;
	review_count: number;
	review_average: number;
}