import { execute } from "../core/client";
import { gt } from "../core/operators";
import { createRepository } from "../core/repository";
import { sql } from "../core/sql";
import { createId, nowIso } from "../core/values";
import type {
	EmailTokenInsert,
	EmailTokenRow,
	EmailTokenType,
	RefreshTokenInsert,
	RefreshTokenRow,
} from "../types";

export const emailTokens = createRepository<EmailTokenRow, EmailTokenInsert>({
	table: "email_tokens",
	columns: [
		"id",
		"user_id",
		"token_hash",
		"type",
		"expires_at",
		"used_at",
		"created_at",
	],
});

export const refreshTokens = createRepository<
	RefreshTokenRow,
	RefreshTokenInsert
>({
	table: "refresh_tokens",
	columns: [
		"id",
		"user_id",
		"token_hash",
		"expires_at",
		"revoked_at",
		"created_at",
	],
});

export function issueEmailToken(values: EmailTokenInsert): EmailTokenRow {
	return emailTokens.insert({ ...values, id: values.id ?? createId() });
}

export function findUsableEmailToken(
	tokenHash: string,
	type: EmailTokenType,
): EmailTokenRow | undefined {
	return emailTokens.findOne({
		token_hash: tokenHash,
		type,
		used_at: null,
		expires_at: gt(nowIso()),
	});
}

export function consumeEmailToken(id: string): boolean {
	return (
		execute(
			sql`UPDATE email_tokens SET used_at = ${nowIso()}
				WHERE id = ${id} AND used_at IS NULL AND expires_at > ${nowIso()}`,
		).changes === 1
	);
}

export function revokeEmailTokens(
	userId: string,
	type: EmailTokenType,
): number {
	return execute(
		sql`UPDATE email_tokens SET used_at = ${nowIso()}
			WHERE user_id = ${userId} AND type = ${type} AND used_at IS NULL`,
	).changes;
}

export function issueRefreshToken(values: RefreshTokenInsert): RefreshTokenRow {
	return refreshTokens.insert({ ...values, id: values.id ?? createId() });
}

export function findUsableRefreshToken(
	tokenHash: string,
): RefreshTokenRow | undefined {
	return refreshTokens.findOne({
		token_hash: tokenHash,
		revoked_at: null,
		expires_at: gt(nowIso()),
	});
}

// Contrairement a findUsableRefreshToken, ne filtre ni sur revoked_at ni sur
// expires_at : c'est la lecture qui permet de dater une revocation (revoked_at
// est un ISO 8601 UTC, cf. nowIso) et donc de distinguer une course entre deux
// refresh simultanes d'un vrai rejeu.
export function findRefreshTokenByHash(
	tokenHash: string,
): RefreshTokenRow | undefined {
	return refreshTokens.findOne({ token_hash: tokenHash });
}

export function revokeRefreshToken(tokenHash: string): boolean {
	return (
		execute(
			sql`UPDATE refresh_tokens SET revoked_at = ${nowIso()}
				WHERE token_hash = ${tokenHash} AND revoked_at IS NULL`,
		).changes === 1
	);
}

export function revokeAllRefreshTokens(userId: string): number {
	return execute(
		sql`UPDATE refresh_tokens SET revoked_at = ${nowIso()}
			WHERE user_id = ${userId} AND revoked_at IS NULL`,
	).changes;
}

export function purgeExpiredTokens(): number {
	const now = nowIso();
	return (
		execute(sql`DELETE FROM email_tokens WHERE expires_at <= ${now}`).changes
		+ execute(sql`DELETE FROM refresh_tokens WHERE expires_at <= ${now}`).changes
	);
}
