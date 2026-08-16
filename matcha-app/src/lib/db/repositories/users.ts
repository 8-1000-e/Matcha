import {
	execute,
	queryAll,
	queryOne,
	queryScalar,
	transaction,
} from "../core/client";
import { createRepository } from "../core/repository";
import { raw, sql } from "../core/sql";
import { createId, nowIso, toFlag, type Flag } from "../core/values";
import { MINIMUM_TAGS, type UserInsert, type UserRow } from "../types";

export const users = createRepository<UserRow, UserInsert>({
	table: "users",
	columns: [
		"id",
		"email",
		"username",
		"first_name",
		"last_name",
		"password_hash",
		"has_password",
		"birth_date",
		"gender",
		"orientation",
		"biography",
		"is_verified",
		"profile_completed",
		"latitude",
		"longitude",
		"city",
		"neighborhood",
		"location_consent",
		"location_updated_at",
		"is_online",
		"last_seen_at",
		"created_at",
		"deleted_at",
	],
	defaultOrder: [{ column: "created_at", direction: "desc" }],
});

export function createUser(values: UserInsert): UserRow {
	return users.insert({ ...values, id: values.id ?? createId() });
}

export function findUserByEmail(email: string): UserRow | undefined {
	return users.findOne({ email });
}

export function findUserByUsername(username: string): UserRow | undefined {
	return users.findOne({ username });
}

export function isEmailTaken(email: string, exceptId?: string): boolean {
	return (
		queryScalar<number>(
			sql`SELECT 1 FROM users
				WHERE email = ${email} AND id <> ${exceptId ?? ""} LIMIT 1`,
		) === 1
	);
}

export function isUsernameTaken(username: string, exceptId?: string): boolean {
	return (
		queryScalar<number>(
			sql`SELECT 1 FROM users
				WHERE username = ${username} AND id <> ${exceptId ?? ""} LIMIT 1`,
		) === 1
	);
}

export function markUserVerified(id: string): UserRow | undefined {
	return users.updateById(id, { is_verified: 1 });
}

export function updatePassword(id: string, passwordHash: string): void {
	users.updateById(id, { password_hash: passwordHash, has_password: 1 });
}

export function touchLastSeen(id: string): boolean {
	return (
		execute(
			sql`UPDATE users SET last_seen_at = ${nowIso()} WHERE id = ${id}`,
		).changes === 1
	);
}

export function setLocation(
	id: string,
	location: {
		latitude: number | null;
		longitude: number | null;
		city: string | null;
		neighborhood: string | null;
		consent: boolean;
	},
): UserRow | undefined {
	return users.updateById(id, {
		latitude: location.latitude,
		longitude: location.longitude,
		city: location.city,
		neighborhood: location.neighborhood,
		location_consent: toFlag(location.consent),
		location_updated_at: new Date().toISOString(),
	});
}

export function setLocationConsent(
	id: string,
	consent: boolean,
): UserRow | undefined {
	return users.updateById(id, { location_consent: toFlag(consent) });
}

export function refreshProfileCompletion(id: string): Flag {
	return transaction(() => {
		const row = queryOne<{ completed: Flag }>(
			sql`SELECT CASE WHEN users.gender IS NOT NULL
					AND users.biography IS NOT NULL
					AND length(trim(users.biography)) > 0
					AND (users.latitude IS NOT NULL OR users.city IS NOT NULL)
					AND (
						SELECT count(*) FROM user_tags
						WHERE user_tags.user_id = users.id
					) >= ${MINIMUM_TAGS}
					AND EXISTS (
						SELECT 1 FROM photos
						WHERE photos.user_id = users.id AND photos.is_profile = 1
					)
				THEN 1 ELSE 0 END AS completed
				FROM users WHERE users.id = ${id}`,
		);
		const completed = row?.completed ?? 0;
		users.updateById(id, { profile_completed: completed });
		return completed;
	});
}

export function deleteUser(id: string): boolean {
	return users.removeById(id);
}

export const DELETION_GRACE_DAYS = 14;

export function markUserDeleted(id: string): string | null {
	const at = nowIso();
	return users.updateById(id, { deleted_at: at }) === undefined ? null : at;
}

export function restoreUser(id: string): boolean {
	return (
		execute(
			sql`UPDATE users SET deleted_at = NULL
				WHERE id = ${id} AND deleted_at IS NOT NULL`,
		).changes === 1
	);
}

export function purgeDate(deletedAt: string): string {
	const at = new Date(deletedAt);
	at.setUTCDate(at.getUTCDate() + DELETION_GRACE_DAYS);
	return at.toISOString();
}

export interface ExpiredAccount {
	id: string;
	paths: string[];
}

export function listExpiredDeletions(): ExpiredAccount[] {
	const rows = queryAll<{ id: string; paths: string | null }>(
		sql`SELECT users.id AS id,
				(
					SELECT group_concat(photos.path) FROM photos
					WHERE photos.user_id = users.id
				) AS paths
			FROM users
			WHERE users.deleted_at IS NOT NULL
				AND users.deleted_at <
					strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-${raw(String(DELETION_GRACE_DAYS))} days')`,
	);

	return rows.map((row) => ({
		id: row.id,
		paths: row.paths === null ? [] : row.paths.split(","),
	}));
}
