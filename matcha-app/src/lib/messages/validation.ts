import type { MatchListOptions } from "@/lib/db";
import { isRecord, type Validated } from "@/lib/profile/validation";

const MESSAGE_MAX = 1000;
const MESSAGE_CONTROL_RE = /[^\P{Cc}\n]/u;

export function validateMessageBody(body: unknown): Validated<string>
{
	if (!isRecord(body))
	{
		return { ok: false, errors: ["invalid request body"] };
	}

	const raw = body.body;
	if (typeof raw !== "string")
	{
		return { ok: false, errors: ["message is invalid"] };
	}

	const text = raw.trim();
	if (text.length === 0)
	{
		return { ok: false, errors: ["message is empty"] };
	}
	if (text.length > MESSAGE_MAX)
	{
		return { ok: false, errors: ["message is too long"] };
	}
	if (MESSAGE_CONTROL_RE.test(text))
	{
		return { ok: false, errors: ["message is invalid"] };
	}

	return { ok: true, value: text };
}

const SEARCH_MAX = 32;

export function validateMatchList(
	parameters: URLSearchParams,
): Validated<MatchListOptions>
{
	const options: MatchListOptions = {};

	const rawLimit = parameters.get("limit");
	if (rawLimit !== null)
	{
		const limit = Number(rawLimit);
		if (!Number.isInteger(limit) || limit < 1 || limit > 50)
		{
			return { ok: false, errors: ["limit is invalid"] };
		}
		options.limit = limit;
	}

	const before = parameters.get("before");
	const beforeId = parameters.get("before_id");
	if ((before === null) !== (beforeId === null))
	{
		return { ok: false, errors: ["cursor is incomplete"] };
	}
	if (before !== null && beforeId !== null)
	{
		options.before = { activity_at: before, id: beforeId };
	}

	const query = parameters.get("q");
	if (query !== null)
	{
		const text = query.trim();
		if (text.length > SEARCH_MAX || MESSAGE_CONTROL_RE.test(text))
		{
			return { ok: false, errors: ["search is invalid"] };
		}
		options.query = text;
	}

	return { ok: true, value: options };
}

export function validateConversationLimit(raw: string | null): Validated<number | undefined>
{
	if (raw === null)
	{
		return { ok: true, value: undefined };
	}

	const limit = Number(raw);
	if (!Number.isInteger(limit) || limit < 1 || limit > 200)
	{
		return { ok: false, errors: ["limit is invalid"] };
	}

	return { ok: true, value: limit };
}
