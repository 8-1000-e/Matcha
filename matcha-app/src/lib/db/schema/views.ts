const REVIEW_CONFIDENCE = "8.0";
const NEUTRAL_SCORE = "3.0";
export function ageYears(birthDateColumn: string): string {
	return `(CAST(strftime('%Y%m%d','now') AS INT)
		- CAST(strftime('%Y%m%d', ${birthDateColumn}) AS INT)) / 10000`;
}
export const PRESENCE_WINDOW_SECONDS = 90;
export function onlineNow(lastSeenColumn: string): string {
	return `(${lastSeenColumn} IS NOT NULL AND ${lastSeenColumn} >
		strftime('%Y-%m-%dT%H:%M:%fZ','now','-${PRESENCE_WINDOW_SECONDS} seconds'))`;
}
export const VIEWS: readonly string[] = [
	`DROP VIEW IF EXISTS user_popularity;
	CREATE VIEW user_popularity AS
	SELECT
		parts.user_id AS user_id,
		parts.review_count AS review_count,
		ROUND(parts.review_average, 2) AS review_average,
		ROUND(parts.bayesian_score, 4) AS bayesian_score,
		parts.like_count AS like_count,
		parts.view_count AS view_count,
		parts.match_count AS match_count,
		parts.report_count AS report_count,
		ROUND(parts.engagement_score, 2) AS engagement_score,
		ROUND(
			MAX(0.0, MIN(100.0,
				0.6 * parts.bayesian_score * 20.0
				+ 0.4 * parts.engagement_score
				- MIN(parts.report_count * 5.0, 30.0)
			)),
			2
		) AS popularity_score
	FROM (
		SELECT
			users.id AS user_id,
			COALESCE(reviewed.review_count, 0) AS review_count,
			COALESCE(reviewed.review_average, 0.0) AS review_average,
			(
				${REVIEW_CONFIDENCE} * (
					SELECT COALESCE(AVG(score), ${NEUTRAL_SCORE}) FROM reviews
				) + COALESCE(reviewed.score_sum, 0)
			) / (${REVIEW_CONFIDENCE} + COALESCE(reviewed.review_count, 0))
				AS bayesian_score,
			COALESCE(liked.like_count, 0) AS like_count,
			COALESCE(viewed.view_count, 0) AS view_count,
			COALESCE(matched.match_count, 0) AS match_count,
			COALESCE(reported.report_count, 0) AS report_count,
			40.0 * MIN(
				COALESCE(liked.like_count, 0) * 1.0
					/ MAX(COALESCE(viewed.view_count, 0), 1),
				1.0
			)
			+ 30.0 * MIN(COALESCE(matched.match_count, 0) / 10.0, 1.0)
			+ 30.0 * (
				users.profile_completed
				+ MIN(COALESCE(pictured.photo_count, 0), 5) / 5.0
				+ MIN(COALESCE(tagged.tag_count, 0), 5) / 5.0
			) / 3.0 AS engagement_score
		FROM users
		LEFT JOIN (
			SELECT
				reviews.target_id AS target_id,
				COUNT(*) AS review_count,
				SUM(reviews.score) AS score_sum,
				AVG(reviews.score) AS review_average
			FROM reviews
			WHERE NOT EXISTS (
				SELECT 1 FROM blocks
				WHERE blocks.blocker_id = reviews.target_id
					AND blocks.blocked_id = reviews.author_id
			)
			GROUP BY reviews.target_id
		) AS reviewed ON reviewed.target_id = users.id
		LEFT JOIN (
			SELECT liked_id AS user_id, COUNT(*) AS like_count
			FROM likes GROUP BY liked_id
		) AS liked ON liked.user_id = users.id
		LEFT JOIN (
			SELECT viewed_id AS user_id, COUNT(*) AS view_count
			FROM profile_views GROUP BY viewed_id
		) AS viewed ON viewed.user_id = users.id
		LEFT JOIN (
			SELECT user_id, COUNT(*) AS match_count FROM (
				SELECT user_a_id AS user_id FROM matches WHERE is_active = 1
				UNION ALL
				SELECT user_b_id AS user_id FROM matches WHERE is_active = 1
			) GROUP BY user_id
		) AS matched ON matched.user_id = users.id
		LEFT JOIN (
			SELECT reported_id AS user_id, COUNT(*) AS report_count
			FROM reports GROUP BY reported_id
		) AS reported ON reported.user_id = users.id
		LEFT JOIN (
			SELECT user_id, COUNT(*) AS photo_count FROM photos GROUP BY user_id
		) AS pictured ON pictured.user_id = users.id
		LEFT JOIN (
			SELECT user_id, COUNT(*) AS tag_count FROM user_tags GROUP BY user_id
		) AS tagged ON tagged.user_id = users.id
	) AS parts`,
	`DROP VIEW IF EXISTS user_profiles;
	CREATE VIEW user_profiles AS
	SELECT
		users.*,
		${ageYears("users.birth_date")} AS age,
		user_popularity.popularity_score AS popularity_score,
		user_popularity.review_average AS review_average,
		user_popularity.review_count AS review_count,
		(
			SELECT photos.path FROM photos
			WHERE photos.user_id = users.id AND photos.is_profile = 1
		) AS profile_photo_path,
		(SELECT COUNT(*) FROM photos WHERE photos.user_id = users.id)
			AS photo_count,
		(SELECT COUNT(*) FROM user_tags WHERE user_tags.user_id = users.id)
			AS tag_count
	FROM users
	JOIN user_popularity ON user_popularity.user_id = users.id`,
];