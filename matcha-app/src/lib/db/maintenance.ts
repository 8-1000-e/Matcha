import { purgeExpiredTokens } from "./repositories/tokens";

const PURGE_INTERVAL_MS = 60 * 60 * 1000;

// Un timer de fond ne survivrait pas au rechargement a chaud de Next et
// serait duplique a chaque instance. On declenche donc le nettoyage sur une
// requete, mais au plus une fois par heure.
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
		// Le menage ne doit jamais faire echouer la requete qui l'a declenche.
		console.error("purgeExpiredTokens failed", error);
	}
}
