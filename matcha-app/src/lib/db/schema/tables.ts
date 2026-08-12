const TIMESTAMP_DEFAULT = "(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))";

export const TABLES: readonly string[] = [
	`CREATE TABLE IF NOT EXISTS users (
		id TEXT PRIMARY KEY,
		email TEXT NOT NULL COLLATE NOCASE UNIQUE,
		username TEXT NOT NULL COLLATE NOCASE UNIQUE,
		first_name TEXT NOT NULL,
		last_name TEXT NOT NULL,
		password_hash TEXT NOT NULL,
		birth_date TEXT NOT NULL,
		gender TEXT CHECK (gender IN ('woman', 'man', 'non_binary', 'other')),
		orientation TEXT NOT NULL DEFAULT 'bi'
			CHECK (orientation IN ('hetero', 'homo', 'bi', 'pan', 'other')),
		biography TEXT,
		is_verified INTEGER NOT NULL DEFAULT 0 CHECK (is_verified IN (0, 1)),
		profile_completed INTEGER NOT NULL DEFAULT 0
			CHECK (profile_completed IN (0, 1)),
		latitude REAL CHECK (latitude IS NULL OR latitude BETWEEN -90 AND 90),
		longitude REAL CHECK (longitude IS NULL OR longitude BETWEEN -180 AND 180),
		city TEXT,
		neighborhood TEXT,
		location_consent INTEGER NOT NULL DEFAULT 0
			CHECK (location_consent IN (0, 1)),
		is_online INTEGER NOT NULL DEFAULT 0 CHECK (is_online IN (0, 1)),
		last_seen_at TEXT,
		created_at TEXT NOT NULL DEFAULT ${TIMESTAMP_DEFAULT},
		CHECK (length(email) BETWEEN 3 AND 254),
		CHECK (length(username) BETWEEN 3 AND 32),
		CHECK (length(birth_date) = 10)
	) STRICT`,
	`CREATE TABLE IF NOT EXISTS email_tokens (
		id TEXT PRIMARY KEY,
		user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
		token_hash TEXT NOT NULL UNIQUE,
		type TEXT NOT NULL
			CHECK (type IN ('email_verification', 'password_reset')),
		expires_at TEXT NOT NULL,
		used_at TEXT,
		created_at TEXT NOT NULL DEFAULT ${TIMESTAMP_DEFAULT}
	) STRICT`,
	`CREATE TABLE IF NOT EXISTS refresh_tokens (
		id TEXT PRIMARY KEY,
		user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
		token_hash TEXT NOT NULL UNIQUE,
		expires_at TEXT NOT NULL,
		revoked_at TEXT,
		created_at TEXT NOT NULL DEFAULT ${TIMESTAMP_DEFAULT}
	) STRICT`,
	`CREATE TABLE IF NOT EXISTS photos (
		id TEXT PRIMARY KEY,
		user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
		path TEXT NOT NULL,
		is_profile INTEGER NOT NULL DEFAULT 0 CHECK (is_profile IN (0, 1)),
		position INTEGER NOT NULL DEFAULT 0,
		created_at TEXT NOT NULL DEFAULT ${TIMESTAMP_DEFAULT}
	) STRICT`,
	`CREATE TABLE IF NOT EXISTS tags (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		label TEXT NOT NULL COLLATE NOCASE UNIQUE
	) STRICT`,
	`CREATE TABLE IF NOT EXISTS user_tags (
		user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
		tag_id INTEGER NOT NULL REFERENCES tags (id) ON DELETE CASCADE,
		PRIMARY KEY (user_id, tag_id)
	) STRICT`,
	`CREATE TABLE IF NOT EXISTS profile_views (
		id TEXT PRIMARY KEY,
		viewer_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
		viewed_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
		viewed_at TEXT NOT NULL DEFAULT ${TIMESTAMP_DEFAULT},
		CHECK (viewer_id <> viewed_id)
	) STRICT`,
	`CREATE TABLE IF NOT EXISTS likes (
		liker_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
		liked_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
		liked_at TEXT NOT NULL DEFAULT ${TIMESTAMP_DEFAULT},
		PRIMARY KEY (liker_id, liked_id),
		CHECK (liker_id <> liked_id)
	) STRICT`,
	`CREATE TABLE IF NOT EXISTS matches (
		id TEXT PRIMARY KEY,
		user_a_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
		user_b_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
		connected_at TEXT NOT NULL DEFAULT ${TIMESTAMP_DEFAULT},
		is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
		UNIQUE (user_a_id, user_b_id),
		CHECK (user_a_id < user_b_id)
	) STRICT`,
	`CREATE TABLE IF NOT EXISTS messages (
		id TEXT PRIMARY KEY,
		match_id TEXT NOT NULL REFERENCES matches (id) ON DELETE CASCADE,
		sender_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
		body TEXT NOT NULL,
		sent_at TEXT NOT NULL DEFAULT ${TIMESTAMP_DEFAULT},
		read_at TEXT,
		CHECK (length(body) BETWEEN 1 AND 2000)
	) STRICT`,
	`CREATE TABLE IF NOT EXISTS reviews (
		id TEXT PRIMARY KEY,
		author_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
		target_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
		score INTEGER NOT NULL CHECK (score BETWEEN 1 AND 5),
		body TEXT CHECK (body IS NULL OR length(body) <= 2000),
		created_at TEXT NOT NULL DEFAULT ${TIMESTAMP_DEFAULT},
		updated_at TEXT NOT NULL DEFAULT ${TIMESTAMP_DEFAULT},
		UNIQUE (author_id, target_id),
		CHECK (author_id <> target_id)
	) STRICT`,
	`CREATE TABLE IF NOT EXISTS blocks (
		blocker_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
		blocked_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
		blocked_at TEXT NOT NULL DEFAULT ${TIMESTAMP_DEFAULT},
		PRIMARY KEY (blocker_id, blocked_id),
		CHECK (blocker_id <> blocked_id)
	) STRICT`,
	`CREATE TABLE IF NOT EXISTS reports (
		id TEXT PRIMARY KEY,
		reporter_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
		reported_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
		target_review_id TEXT REFERENCES reviews (id) ON DELETE CASCADE,
		reason TEXT NOT NULL CHECK (reason IN (
			'fake_account',
			'harassment',
			'scam',
			'inappropriate_behavior',
			'inappropriate_content',
			'identity_theft'
		)),
		reported_at TEXT NOT NULL DEFAULT ${TIMESTAMP_DEFAULT},
		UNIQUE (reporter_id, reported_id),
		CHECK (reporter_id <> reported_id)
	) STRICT`,
	`CREATE TABLE IF NOT EXISTS notifications (
		id TEXT PRIMARY KEY,
		recipient_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
		actor_id TEXT REFERENCES users (id) ON DELETE CASCADE,
		type TEXT NOT NULL
			CHECK (type IN ('LIKED', 'VIEWED', 'MESSAGE', 'MATCH', 'UNLIKED')),
		link TEXT,
		created_at TEXT NOT NULL DEFAULT ${TIMESTAMP_DEFAULT},
		read_at TEXT,
		CHECK (actor_id IS NULL OR actor_id <> recipient_id)
	) STRICT`,
];
