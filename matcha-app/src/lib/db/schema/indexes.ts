export const INDEXES: readonly string[] = [
	"CREATE INDEX IF NOT EXISTS users_birth_date_idx ON users (birth_date)",
	"CREATE INDEX IF NOT EXISTS users_is_online_idx ON users (is_online)",
	"CREATE INDEX IF NOT EXISTS users_last_seen_at_idx ON users (last_seen_at)",
	"CREATE INDEX IF NOT EXISTS users_location_idx ON users (latitude, longitude)",
	"CREATE INDEX IF NOT EXISTS users_city_idx ON users (city)",
	`CREATE INDEX IF NOT EXISTS users_discoverable_idx
		ON users (profile_completed, is_verified, gender, orientation)`,
	"CREATE INDEX IF NOT EXISTS email_tokens_user_idx ON email_tokens (user_id, type)",
	"CREATE INDEX IF NOT EXISTS refresh_tokens_hash_idx ON refresh_tokens (token_hash)",
	"CREATE INDEX IF NOT EXISTS refresh_tokens_user_idx ON refresh_tokens (user_id)",
	"CREATE INDEX IF NOT EXISTS photos_user_idx ON photos (user_id, position)",
	`CREATE UNIQUE INDEX IF NOT EXISTS photos_single_profile_idx
		ON photos (user_id) WHERE is_profile = 1`,
	`CREATE UNIQUE INDEX IF NOT EXISTS photos_position_idx
		ON photos (user_id, position)`,
	"CREATE INDEX IF NOT EXISTS user_tags_tag_idx ON user_tags (tag_id)",
	"CREATE INDEX IF NOT EXISTS profile_views_viewed_idx ON profile_views (viewed_id, viewed_at)",
	"CREATE INDEX IF NOT EXISTS profile_views_viewer_idx ON profile_views (viewer_id, viewed_at)",
	"CREATE INDEX IF NOT EXISTS likes_liked_idx ON likes (liked_id)",
	"CREATE INDEX IF NOT EXISTS matches_user_a_idx ON matches (user_a_id, is_active)",
	"CREATE INDEX IF NOT EXISTS matches_user_b_idx ON matches (user_b_id, is_active)",
	"CREATE INDEX IF NOT EXISTS messages_match_idx ON messages (match_id, sent_at)",
	"CREATE INDEX IF NOT EXISTS messages_unread_idx ON messages (match_id, read_at)",
	"CREATE INDEX IF NOT EXISTS reviews_target_idx ON reviews (target_id)",
	"CREATE INDEX IF NOT EXISTS blocks_blocked_idx ON blocks (blocked_id)",
	"CREATE INDEX IF NOT EXISTS reports_reported_idx ON reports (reported_id)",
	`CREATE INDEX IF NOT EXISTS notifications_recipient_idx
		ON notifications (recipient_id, read_at)`,
	`CREATE INDEX IF NOT EXISTS feed_sessions_created
		ON feed_sessions (created_at)`,
	`CREATE INDEX IF NOT EXISTS cities_search
		ON cities (search_name, population DESC)`,
];