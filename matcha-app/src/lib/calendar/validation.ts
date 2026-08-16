import { isRecord } from "@/lib/profile/validation";

export interface EventInput {
	title: string;
	location: string | null;
	starts_at: string;
	ends_at: string;
}

export const TITLE_MAX = 120;
export const LOCATION_MAX = 200;
export const MAX_DURATION_HOURS = 12;

export function validateEvent(body: unknown):
	{ ok: true; value: EventInput } | { ok: false; errors: string[] }
{
	if (!isRecord(body))
	{
		return { ok: false, errors: ["invalid request body"] };
	}

	if (typeof body.title !== "string")
	{
		return { ok: false, errors: ["title is invalid"] };
	}

	const title = body.title.trim();
	if (title.length === 0)
	{
		return { ok: false, errors: ["title is empty"] };
	}
	if (title.length > TITLE_MAX)
	{
		return { ok: false, errors: ["title is too long"] };
	}

	const raw = body.location;
	if (raw !== undefined && raw !== null && typeof raw !== "string")
	{
		return { ok: false, errors: ["location is invalid"] };
	}

	const trimmed = typeof raw === "string" ? raw.trim() : "";
	if (trimmed.length > LOCATION_MAX)
	{
		return { ok: false, errors: ["location is too long"] };
	}
	const location = trimmed.length === 0 ? null : trimmed;

	if (typeof body.starts_at !== "string" || typeof body.ends_at !== "string")
	{
		return { ok: false, errors: ["dates are invalid"] };
	}

	const starts = new Date(body.starts_at);
	const ends = new Date(body.ends_at);
	if (Number.isNaN(starts.getTime()) || Number.isNaN(ends.getTime()))
	{
		return { ok: false, errors: ["dates are invalid"] };
	}

	if (starts.getTime() <= Date.now())
	{
		return { ok: false, errors: ["start is in the past"] };
	}

	const duration = ends.getTime() - starts.getTime();
	if (duration <= 0)
	{
		return { ok: false, errors: ["end is before start"] };
	}
	if (duration > MAX_DURATION_HOURS * 60 * 60 * 1000)
	{
		return { ok: false, errors: ["event is too long"] };
	}

	return {
		ok: true,
		value: {
			title,
			location,
			starts_at: starts.toISOString(),
			ends_at: ends.toISOString(),
		},
	};
}
