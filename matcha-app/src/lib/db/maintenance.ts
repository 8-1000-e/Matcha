import { purgeFeedSessions } from "./queries/feed";
import { purgeExpiredTokens } from "./repositories/tokens";

const PURGE_INTERVAL_MS = 60 * 60 * 1000;
const state = globalThis as typeof globalThis & { matchaLastPurge?: number };

export function purgeIfDue(): void
{
	const now = Date.now();
	if (state.matchaLastPurge !== undefined && now - state.matchaLastPurge < PURGE_INTERVAL_MS)
	{
		return;
	}
	state.matchaLastPurge = now;

	try
	{
		purgeExpiredTokens();
	}
	catch (error)
	{
		console.error("purgeExpiredTokens failed", error);
	}

	try
	{
		purgeFeedSessions();
	}
	catch (error)
	{
		console.error("purgeFeedSessions failed", error);
	}
}