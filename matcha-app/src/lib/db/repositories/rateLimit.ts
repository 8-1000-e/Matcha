import { execute, queryScalar } from "../core/client";
import { sql } from "../core/sql";
import { nowIso } from "../core/values";

export function countHits(bucket: string, since: string): number {
	return queryScalar<number>(
		sql`SELECT COUNT(*) FROM rate_hits
			WHERE bucket = ${bucket} AND hit_at > ${since}`,
	) ?? 0;
}

export function recordHit(bucket: string): void {
	execute(sql`INSERT INTO rate_hits (bucket, hit_at) VALUES (${bucket}, ${nowIso()})`);
}

export function purgeHits(before: string): void {
	execute(sql`DELETE FROM rate_hits WHERE hit_at <= ${before}`);
}
