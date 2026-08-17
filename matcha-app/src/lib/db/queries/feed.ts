import { execute, queryAll, queryOne, transaction } from "../core/client";
import { sql } from "../core/sql";
import { createId, nowIso } from "../core/values";
import type { UserRow } from "../types";
import {
	findCandidates,
	findCandidatesByIds,
	type DiscoveryOptions,
	type DiscoveryRow,
} from "./discovery";

const SESSION_TTL_SECONDS = 1800;
const CHUNK = 100;

export interface FeedSession {
	id: string;
	total: number;
	exhausted: number;
	created_at: string;
}

export interface FeedPage {
	session: FeedSession;
	items: DiscoveryRow[];
	next: number | null;
	reset: boolean;
}
export function openFeedSession(
	viewer: UserRow,
	filtersHash: string,
	options: DiscoveryOptions,
): FeedSession
{
	return transaction(() =>
	{
		execute(sql`
			DELETE FROM feed_sessions
			WHERE user_id = ${viewer.id} AND filters_hash = ${filtersHash}
		`);

		const session: FeedSession = {
			id: createId(),
			total: 0,
			exhausted: 0,
			created_at: nowIso(),
		};

		execute(sql`
			INSERT INTO feed_sessions (id, user_id, filters_hash, total, created_at)
			VALUES (${session.id}, ${viewer.id}, ${filtersHash}, 0,
				${session.created_at})
		`);

		return extendFeedSession(viewer, session, options);
	});
}

export function findFeedSession(
	viewer: UserRow,
	sessionId: string,
	filtersHash: string,
): FeedSession | null
{
	const oldest = new Date(Date.now() - SESSION_TTL_SECONDS * 1000).toISOString();

	return queryOne<FeedSession>(sql`
		SELECT id, total, exhausted, created_at FROM feed_sessions
		WHERE id = ${sessionId}
			AND user_id = ${viewer.id}
			AND filters_hash = ${filtersHash}
			AND created_at > ${oldest}
	`) ?? null;
}
function extendFeedSession(
	viewer: UserRow,
	session: FeedSession,
	options: DiscoveryOptions,
): FeedSession
{
	const fresh = queryOne<{ total: number; exhausted: number }>(sql`
		SELECT total, exhausted FROM feed_sessions WHERE id = ${session.id}
	`);
	if (fresh === undefined)
	{
		return session;
	}

	const start = fresh.total;
	if (fresh.exhausted === 1)
	{
		return { ...session, total: start, exhausted: 1 };
	}

	const candidates = findCandidates(viewer, {
		...options,
		limit: CHUNK,
		offset: 0,
		excludeIds: knownIds(session.id),
	});

	const exhausted = candidates.length < CHUNK ? 1 : 0;
	candidates.forEach((candidate, index) =>
	{
		execute(sql`
			INSERT INTO feed_entries (session_id, position, candidate_id)
			VALUES (${session.id}, ${start + index}, ${candidate.id})
		`);
	});

	const total = start + candidates.length;
	execute(sql`
		UPDATE feed_sessions SET total = ${total}, exhausted = ${exhausted}
		WHERE id = ${session.id}
	`);

	return { ...session, total, exhausted };
}

function knownIds(sessionId: string): string[]
{
	return queryAll<{ candidate_id: string }>(sql`
		SELECT candidate_id FROM feed_entries WHERE session_id = ${sessionId}
	`).map((row) => row.candidate_id);
}
export function readFeedPage(
	viewer: UserRow,
	session: FeedSession,
	after: number,
	limit: number,
	options: DiscoveryOptions,
): FeedPage
{
	let current = session;
	if (after + limit > current.total && current.exhausted === 0)
	{
		current = transaction(() => extendFeedSession(viewer, current, options));
	}

	const entries = queryAll<{ candidate_id: string; position: number }>(sql`
		SELECT candidate_id, position FROM feed_entries
		WHERE session_id = ${current.id} AND position >= ${after}
		ORDER BY position
		LIMIT ${limit}
	`);

	const rank = new Map(entries.map((entry) => [entry.candidate_id, entry.position]));
	const rows = findCandidatesByIds(viewer, [...rank.keys()], { includeLiked: true })
		.sort((a, b) => (rank.get(a.id) ?? 0) - (rank.get(b.id) ?? 0));

	const last = entries.at(-1);
	const done = last === undefined || (last.position + 1 >= current.total
		&& current.exhausted === 1);

	return {
		session: current,
		items: rows,
		next: done ? null : (last?.position ?? after) + 1,
		reset: false,
	};
}

export function purgeFeedSessions(): number
{
	const oldest = new Date(Date.now() - SESSION_TTL_SECONDS * 1000).toISOString();
	const result = execute(
		sql`DELETE FROM feed_sessions WHERE created_at <= ${oldest}`,
	);
	return result.changes;
}