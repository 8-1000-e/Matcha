import { isRecord, type Validated } from "@/lib/profile/validation";

const BODY_MAX = 2000;
const CONTROL_RE = /[^\P{Cc}\n]/u;

export interface ReviewInput {
	score: number;
	body: string | null;
}

export function validateReview(payload: unknown): Validated<ReviewInput>
{
	if (!isRecord(payload))
	{
		return { ok: false, errors: ["invalid request body"] };
	}

	const score = payload.score;
	if (
		typeof score !== "number"
		|| !Number.isInteger(score)
		|| score < 1
		|| score > 5
	)
	{
		return { ok: false, errors: ["score must be an integer between 1 and 5"] };
	}

	const raw = payload.body;
	if (raw === undefined || raw === null)
	{
		return { ok: true, value: { score, body: null } };
	}
	if (typeof raw !== "string")
	{
		return { ok: false, errors: ["review is invalid"] };
	}

	const text = raw.trim();
	if (text.length === 0)
	{
		return { ok: true, value: { score, body: null } };
	}
	if (text.length > BODY_MAX)
	{
		return { ok: false, errors: ["review is too long"] };
	}
	if (CONTROL_RE.test(text))
	{
		return { ok: false, errors: ["review is invalid"] };
	}

	return { ok: true, value: { score, body: text } };
}
