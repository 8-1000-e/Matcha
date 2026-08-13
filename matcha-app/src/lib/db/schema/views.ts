export function ageYears(birthDateColumn: string): string {
	return `(CAST(strftime('%Y%m%d','now') AS INT)
		- CAST(strftime('%Y%m%d', ${birthDateColumn}) AS INT)) / 10000`;
}
export const VIEWS: readonly string[] = [
	`DROP VIEW IF EXISTS user_popularity;
	CREATE VIEW user_popularity AS
	SELECT
		users.id AS user_id,
		COUNT(reviews.id) AS review_count,
		ROUND(COALESCE(AVG(reviews.score), 0.0), 2) AS review_average
	FROM users
	LEFT JOIN reviews ON reviews.target_id = users.id
	GROUP BY users.id`,
	`DROP VIEW IF EXISTS user_profiles;
	CREATE VIEW user_profiles AS
	SELECT
		users.*,
		${ageYears("users.birth_date")} AS age,
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