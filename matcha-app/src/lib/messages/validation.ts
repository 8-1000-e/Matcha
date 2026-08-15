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
