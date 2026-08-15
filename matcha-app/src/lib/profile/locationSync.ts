export const LOCATION_SYNC_INTERVAL_MS = 24 * 60 * 60 * 1000;

export function syncDue(updatedAt: string | null): boolean {
	if (updatedAt === null) {
		return true;
	}
	const stamp = new Date(updatedAt).getTime();
	if (!Number.isFinite(stamp)) {
		return true;
	}
	return Date.now() - stamp >= LOCATION_SYNC_INTERVAL_MS;
}
