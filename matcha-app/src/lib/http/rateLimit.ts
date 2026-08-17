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

function clientIp(request: Request): string {
	const forwarded = request.headers.get("x-forwarded-for") ?? "";
	const first = forwarded.split(",")[0]?.trim() ?? "";

	return first.length > 0 ? first : "local";
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
	const buckets = [`${rule.name}:ip:${clientIp(request)}`];
	if (subject !== null && subject.length > 0) {
		buckets.push(`${rule.name}:id:${subject.toLowerCase()}`);
	}

	const window = since(rule.windowSeconds);
	for (const bucket of buckets) {
		if (countHits(bucket, window) >= rule.limit) {
			return tooManyRequests();
		}
	}

	purgeHits(since(PURGE_WINDOW_SECONDS));
	for (const bucket of buckets) {
		recordHit(bucket);
	}

	return null;
}
