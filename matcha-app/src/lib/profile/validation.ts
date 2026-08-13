import {
	CONTROL_RE,
	EMAIL_MAX,
	EMAIL_MIN,
	EMAIL_RE,
	NAME_MAX,
	NAME_RE,
} from "@/lib/auth/validation";
import {
	GENDERS,
	MINIMUM_TAGS,
	ORIENTATIONS,
	type Gender,
	type Orientation,
} from "@/lib/db";

export const MAXIMUM_TAGS = 10;

const BIOGRAPHY_MAX = 500;
const CITY_MAX = 100;
const BIOGRAPHY_CONTROL_RE = /[^\P{Cc}\n]/u;
const LATITUDE_MAX = 90;
const LONGITUDE_MAX = 180;

export interface ProfilePatch {
	first_name?: string;
	last_name?: string;
	email?: string;
	gender?: Gender;
	orientation?: Orientation;
	biography?: string;
}

export type LocationInput =
	| { mode: "gps"; latitude: number; longitude: number }
	| { mode: "manual"; city: string }
	| {
		mode: "picked";
		city: string;
		neighborhood: string | null;
		latitude: number;
		longitude: number;
	};

export type Validated<Value> =
	| { ok: true; value: Value }
	| { ok: false; errors: string[] };

function isRecord(value: unknown): value is Record<string, unknown>
{
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readName(
	raw: unknown,
	label: string,
	errors: string[],
): string | undefined
{
	if (typeof raw !== "string")
	{
		errors.push(`${label} is invalid`);
		return undefined;
	}

	const name = raw.trim();
	if (name.length === 0)
	{
		errors.push(`${label} is empty`);
		return undefined;
	}
	if (name.length > NAME_MAX)
	{
		errors.push(`${label} is too long`);
		return undefined;
	}
	if (!NAME_RE.test(name))
	{
		errors.push(`${label} is invalid`);
		return undefined;
	}
	return name;
}

function readEmail(raw: unknown, errors: string[]): string | undefined
{
	if (typeof raw !== "string")
	{
		errors.push("email is invalid");
		return undefined;
	}

	const email = raw.trim().toLowerCase();
	if (email.length < EMAIL_MIN)
	{
		errors.push("email is too short");
		return undefined;
	}
	if (email.length > EMAIL_MAX)
	{
		errors.push("email is too long");
		return undefined;
	}
	if (CONTROL_RE.test(email) || !EMAIL_RE.test(email))
	{
		errors.push("email is invalid");
		return undefined;
	}
	return email;
}

function readBiography(raw: unknown, errors: string[]): string | undefined
{
	if (typeof raw !== "string")
	{
		errors.push("biography is invalid");
		return undefined;
	}

	const biography = raw.trim();
	if (biography.length === 0)
	{
		errors.push("biography is empty");
		return undefined;
	}
	if (biography.length > BIOGRAPHY_MAX)
	{
		errors.push("biography is too long");
		return undefined;
	}
	if (BIOGRAPHY_CONTROL_RE.test(biography))
	{
		errors.push("biography is invalid");
		return undefined;
	}
	return biography;
}

export function validateProfilePatch(body: unknown): Validated<ProfilePatch>
{
	if (!isRecord(body))
	{
		return { ok: false, errors: ["invalid request body"] };
	}

	const errors: string[] = [];
	const patch: ProfilePatch = {};

	if (body.first_name !== undefined)
	{
		patch.first_name = readName(body.first_name, "first name", errors);
	}
	if (body.last_name !== undefined)
	{
		patch.last_name = readName(body.last_name, "last name", errors);
	}
	if (body.email !== undefined)
	{
		patch.email = readEmail(body.email, errors);
	}
	if (body.gender !== undefined)
	{
		if (!GENDERS.includes(body.gender as Gender))
		{
			errors.push("gender is invalid");
		}
		else
		{
			patch.gender = body.gender as Gender;
		}
	}
	if (body.orientation !== undefined)
	{
		if (!ORIENTATIONS.includes(body.orientation as Orientation))
		{
			errors.push("orientation is invalid");
		}
		else
		{
			patch.orientation = body.orientation as Orientation;
		}
	}
	if (body.biography !== undefined)
	{
		patch.biography = readBiography(body.biography, errors);
	}

	if (errors.length > 0)
	{
		return { ok: false, errors };
	}
	if (Object.keys(patch).length === 0)
	{
		return { ok: false, errors: ["no field to update"] };
	}

	return { ok: true, value: patch };
}

export function validateTags(body: unknown): Validated<string[]>
{
	if (!isRecord(body))
	{
		return { ok: false, errors: ["invalid request body"] };
	}

	const raw = body.tags;
	if (!Array.isArray(raw) || raw.some((label) => typeof label !== "string"))
	{
		return { ok: false, errors: ["tags must be a list of labels"] };
	}

	const seen = new Set<string>();
	const labels: string[] = [];
	for (const label of raw as string[])
	{
		const trimmed = label.trim();
		const key = trimmed.toLowerCase();
		if (trimmed.length === 0 || seen.has(key))
		{
			continue;
		}
		seen.add(key);
		labels.push(trimmed);
	}

	if (labels.length < MINIMUM_TAGS)
	{
		return { ok: false, errors: [`at least ${MINIMUM_TAGS} tags are required`] };
	}
	if (labels.length > MAXIMUM_TAGS)
	{
		return { ok: false, errors: [`at most ${MAXIMUM_TAGS} tags are allowed`] };
	}

	return { ok: true, value: labels };
}

export function validateLocation(body: unknown): Validated<LocationInput>
{
	if (!isRecord(body))
	{
		return { ok: false, errors: ["invalid request body"] };
	}

	const hasPoint = body.latitude !== undefined || body.longitude !== undefined;
	const point = hasPoint ? readPoint(body) : null;
	if (hasPoint && point === null)
	{
		return { ok: false, errors: ["coordinates are invalid"] };
	}
	if (point !== null && body.city === undefined)
	{
		return { ok: true, value: { mode: "gps", ...point } };
	}

	if (body.city !== undefined)
	{
		const city = readPlaceName(body.city);
		if (city === null || city.length === 0)
		{
			return { ok: false, errors: ["city is invalid"] };
		}

		if (point === null)
		{
			return { ok: true, value: { mode: "manual", city } };
		}

		let neighborhood: string | null = null;
		if (body.neighborhood !== undefined && body.neighborhood !== null)
		{
			neighborhood = readPlaceName(body.neighborhood);
			if (neighborhood === null || neighborhood.length === 0)
			{
				return { ok: false, errors: ["neighborhood is invalid"] };
			}
		}

		return { ok: true, value: { mode: "picked", city, neighborhood, ...point } };
	}

	return { ok: false, errors: ["coordinates or a city are required"] };
}

function readPoint(
	body: Record<string, unknown>,
): { latitude: number; longitude: number } | null
{
	const { latitude, longitude } = body;
	if (typeof latitude !== "number" || typeof longitude !== "number"
		|| !Number.isFinite(latitude) || !Number.isFinite(longitude)
		|| Math.abs(latitude) > LATITUDE_MAX
		|| Math.abs(longitude) > LONGITUDE_MAX)
	{
		return null;
	}
	return { latitude, longitude };
}
function readPlaceName(value: unknown): string | null
{
	if (typeof value !== "string")
	{
		return null;
	}
	const name = value.trim();
	if (name.length > CITY_MAX || CONTROL_RE.test(name))
	{
		return null;
	}
	return name;
}

export function validatePhotoOrder(body: unknown): Validated<string[]>
{
	if (!isRecord(body))
	{
		return { ok: false, errors: ["invalid request body"] };
	}

	const raw = body.ids;
	if (!Array.isArray(raw) || raw.length === 0
		|| raw.some((id) => typeof id !== "string" || id.length === 0))
	{
		return { ok: false, errors: ["photo order must be a list of ids"] };
	}

	const ids = raw as string[];
	if (new Set(ids).size !== ids.length)
	{
		return { ok: false, errors: ["photo order contains duplicates"] };
	}

	return { ok: true, value: ids };
}

export function validateProfilePhoto(body: unknown): Validated<true>
{
	if (!isRecord(body) || body.is_profile !== true)
	{
		return { ok: false, errors: ["is_profile must be true"] };
	}
	return { ok: true, value: true };
}