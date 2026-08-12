export const TRIGGERS: readonly string[] = [
	`CREATE TRIGGER IF NOT EXISTS photos_limit_before_insert
	BEFORE INSERT ON photos
	BEGIN
		SELECT RAISE(ABORT, 'photo_limit_reached')
		WHERE (SELECT COUNT(*) FROM photos WHERE user_id = NEW.user_id) >= 5;
	END`,
	`CREATE TRIGGER IF NOT EXISTS likes_require_profile_photo
	BEFORE INSERT ON likes
	BEGIN
		SELECT RAISE(ABORT, 'profile_photo_required')
		WHERE NOT EXISTS (
			SELECT 1 FROM photos
			WHERE photos.user_id = NEW.liker_id AND photos.is_profile = 1
		);
	END`,
	`CREATE TRIGGER IF NOT EXISTS likes_block_guard
	BEFORE INSERT ON likes
	BEGIN
		SELECT RAISE(ABORT, 'blocked_user')
		WHERE EXISTS (
			SELECT 1 FROM blocks
			WHERE (blocks.blocker_id = NEW.liker_id AND blocks.blocked_id = NEW.liked_id)
				OR (blocks.blocker_id = NEW.liked_id AND blocks.blocked_id = NEW.liker_id)
		);
	END`,
	`CREATE TRIGGER IF NOT EXISTS likes_deactivate_match_after_delete
	AFTER DELETE ON likes
	BEGIN
		UPDATE matches SET is_active = 0
		WHERE user_a_id = MIN(OLD.liker_id, OLD.liked_id)
			AND user_b_id = MAX(OLD.liker_id, OLD.liked_id);
	END`,
	`CREATE TRIGGER IF NOT EXISTS blocks_drop_likes_after_insert
	AFTER INSERT ON blocks
	BEGIN
		DELETE FROM likes
		WHERE (liker_id = NEW.blocker_id AND liked_id = NEW.blocked_id)
			OR (liker_id = NEW.blocked_id AND liked_id = NEW.blocker_id);
		DELETE FROM notifications
		WHERE recipient_id = NEW.blocker_id AND actor_id = NEW.blocked_id;
	END`,
	`CREATE TRIGGER IF NOT EXISTS reviews_require_match_before_insert
	BEFORE INSERT ON reviews
	BEGIN
		SELECT RAISE(ABORT, 'review_requires_match')
		WHERE NOT EXISTS (
			SELECT 1 FROM matches
			WHERE user_a_id = MIN(NEW.author_id, NEW.target_id)
				AND user_b_id = MAX(NEW.author_id, NEW.target_id)
		);
	END`,
	`CREATE TRIGGER IF NOT EXISTS reviews_touch_before_update
	AFTER UPDATE OF score, body ON reviews
	BEGIN
		UPDATE reviews
		SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
		WHERE id = NEW.id;
	END`,
	`CREATE TRIGGER IF NOT EXISTS messages_require_active_match
	BEFORE INSERT ON messages
	BEGIN
		SELECT RAISE(ABORT, 'match_inactive')
		WHERE NOT EXISTS (
			SELECT 1 FROM matches
			WHERE matches.id = NEW.match_id
				AND matches.is_active = 1
				AND NEW.sender_id IN (matches.user_a_id, matches.user_b_id)
		);
	END`,
];
