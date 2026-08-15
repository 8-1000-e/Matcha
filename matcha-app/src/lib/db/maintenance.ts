import { removePhotoFileSync } from "@/lib/profile/storage";
import { purgeFeedSessions } from "./queries/feed";
import { purgeExpiredTokens } from "./repositories/tokens";
import { deleteUser, listExpiredDeletions } from "./repositories/users";

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

	try
	{
		purgeDeletedAccounts();
	}
	catch (error)
	{
		console.error("purgeDeletedAccounts failed", error);
	}
}

export function purgeDeletedAccounts(): number
{
	let purged = 0;

	for (const account of listExpiredDeletions())
	{
		for (const path of account.paths)
		{
			removePhotoFileSync(path);
		}
		if (deleteUser(account.id))
		{
			purged += 1;
		}
	}

	return purged;
}