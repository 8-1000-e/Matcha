import { queryAll, queryOne } from "../core/client";
import { createRepository } from "../core/repository";
import { sql } from "../core/sql";
import type {
	OAuthAccountInsert,
	OAuthAccountRow,
	OAuthProvider,
} from "../types";

export const oauthAccounts = createRepository<
	OAuthAccountRow,
	OAuthAccountInsert
>({
	table: "oauth_accounts",
	columns: ["provider", "provider_user_id", "user_id", "email", "linked_at"],
	defaultOrder: [{ column: "linked_at", direction: "desc" }],
});

export function findOAuthAccount(
	provider: OAuthProvider,
	providerUserId: string,
): OAuthAccountRow | undefined {
	return queryOne<OAuthAccountRow>(
		sql`SELECT * FROM oauth_accounts
			WHERE provider = ${provider} AND provider_user_id = ${providerUserId}`,
	);
}

export function listOAuthAccounts(userId: string): OAuthAccountRow[] {
	return queryAll<OAuthAccountRow>(
		sql`SELECT * FROM oauth_accounts
			WHERE user_id = ${userId}
			ORDER BY linked_at DESC`,
	);
}

export function linkOAuthAccount(values: OAuthAccountInsert): OAuthAccountRow {
	return oauthAccounts.insert(values);
}

export function unlinkOAuthAccount(
	userId: string,
	provider: OAuthProvider,
): boolean {
	return oauthAccounts.remove({ user_id: userId, provider }) === 1;
}
