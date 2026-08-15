import { isRecord, type Validated } from "@/lib/profile/validation";

export function validateRead(body: unknown): Validated<true>
{
	if (!isRecord(body) || body.read !== true)
	{
		return { ok: false, errors: ["read must be true"] };
	}
	return { ok: true, value: true };
}
