import { countHits, purgeHits, recordHit } from "@/lib/db";

export interface RateRule {
	name: string;
	limit: number;
	windowSeconds: number;
}

export const LOGIN_RULE: RateRule = { name: "login", limit: 10, windowSeconds: 300 };
export const REGISTER_RULE: RateRule = {
	name: "register",
	limit: 5,
	windowSeconds: 3600,
};
export const EMAIL_RULE: RateRule = { name: "email", limit: 3, windowSeconds: 900 };

const PURGE_WINDOW_SECONDS = 86_400;

const SPREAD_FACTOR = 5;

function clientIp(request: Request): string | null {
	const forwarded = request.headers.get("x-forwarded-for")
		?? request.headers.get("x-real-ip")
		?? "";
	const first = forwarded.split(",")[0]?.trim().toLowerCase() ?? "";

	return first.length > 0 ? first : null;
}

function since(seconds: number): string {
	return new Date(Date.now() - seconds * 1000).toISOString();
}

export function tooManyRequests(): Response {
	return Response.json({ errors: ["too_many_requests"] }, { status: 429 });
}

export function rateLimited(
	request: Request,
	rule: RateRule,
	subject: string | null,
): Response | null {
	const ip = clientIp(request);
	const key = subject === null ? "" : subject.trim().toLowerCase();
	const buckets: { bucket: string; limit: number }[] = [];

	if (ip !== null) {
		buckets.push({ bucket: `${rule.name}:ip:${ip}`, limit: rule.limit });
	}
	if (key.length > 0) {
		buckets.push({
			bucket: `${rule.name}:id:${key}:${ip ?? "direct"}`,
			limit: rule.limit,
		});
		buckets.push({
			bucket: `${rule.name}:id:${key}`,
			limit: rule.limit * SPREAD_FACTOR,
		});
	}
	if (buckets.length === 0) {
		return null;
	}

	const window = since(rule.windowSeconds);
	for (const entry of buckets) {
		if (countHits(entry.bucket, window) >= entry.limit) {
			return tooManyRequests();
		}
	}

	purgeHits(since(PURGE_WINDOW_SECONDS));
	for (const entry of buckets) {
		recordHit(entry.bucket);
	}

	return null;
}
