import { randomBytes, randomInt } from "node:crypto";
import type { Gender } from "@/lib/db/types";
import { pick } from "./random";

const RANDOM_USER_URL = "https://randomuser.me/api/";
const SEED = "matcha";
const NATIONALITIES = "fr,gb,es,de,nl";
export const EMAIL_DOMAIN = "seed.matcha";
const USERNAME_RE = /[^a-z0-9._-]/g;
const USERNAME_MAX = 32;
const USERNAME_FALLBACK = "seed";
const BIRTH_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MINIMUM_AGE = 18;
const MAXIMUM_AGE = 120;
const FALLBACK_MAX_AGE = 60;
const FALLBACK_PICTURE = "https://i.pravatar.cc/600?u=";
const FALLBACK_FIRST_NAMES = [
	"Ana", "Louis", "Marta", "Yanis", "Claire", "Hugo",
	"Nina", "Samir", "Eva", "Tom", "Lila", "Noe",
] as const;
const FALLBACK_LAST_NAMES = [
	"Vidal", "Moreau", "Sanchez", "Keller", "Duarte", "Novak",
	"Lambert", "Rossi", "Haddad", "Bauer", "Costa", "Weber",
] as const;

interface RandomUserResult {
	name: { first: string; last: string };
	login: { username: string };
	gender: string;
	dob: { date: string };
}

interface RandomUserResponse {
	results: RandomUserResult[];
}

export interface Identity {
	first_name: string;
	last_name: string;
	username: string;
	email: string;
	gender: Gender;
	birth_date: string;
	picture: string;
}

export async function fetchIdentities(count: number): Promise<Identity[]>
{
	const identities: Identity[] = [];

	for (const result of await requestResults(count))
	{
		const identity = toIdentity(result, identities.length);
		if (identity !== null)
		{
			identities.push(identity);
		}
	}

	while (identities.length < count)
	{
		identities.push(fallbackIdentity(identities.length));
	}

	return identities.slice(0, count);
}

async function requestResults(count: number): Promise<RandomUserResult[]>
{
	const url = `${RANDOM_USER_URL}?results=${count}`
		+ `&seed=${SEED}&nat=${NATIONALITIES}`;

	try
	{
		const response = await fetch(url);
		if (!response.ok)
		{
			console.warn(`randomuser.me a repondu ${response.status}, repli hors ligne`);
			return [];
		}

		const payload = await response.json() as Partial<RandomUserResponse>;
		return Array.isArray(payload.results) ? payload.results : [];
	}
	catch
	{
		console.warn("randomuser.me injoignable, repli hors ligne");
		return [];
	}
}

function toIdentity(result: RandomUserResult, index: number): Identity | null
{
	const birthDate = result.dob.date.slice(0, 10);
	if (!isAdult(birthDate))
	{
		return null;
	}

	const username = safeUsername(result.login.username, index);

	return {
		first_name: result.name.first,
		last_name: result.name.last,
		username,
		email: `${username}@${EMAIL_DOMAIN}`,
		gender: toGender(result.gender),
		birth_date: birthDate,
		picture: `${FALLBACK_PICTURE}${username}`,
	};
}

function fallbackIdentity(index: number): Identity
{
	const seed = randomBytes(4).toString("hex");
	const firstName = pick(FALLBACK_FIRST_NAMES);
	const username = safeUsername(`${firstName}${seed}`, index);

	return {
		first_name: firstName,
		last_name: pick(FALLBACK_LAST_NAMES),
		username,
		email: `${username}@${EMAIL_DOMAIN}`,
		gender: toGender(randomInt(2) === 0 ? "female" : "male"),
		birth_date: randomBirthDate(),
		picture: `${FALLBACK_PICTURE}${seed}`,
	};
}

function randomBirthDate(): string
{
	const age = randomInt(MINIMUM_AGE + 1, FALLBACK_MAX_AGE);
	const year = new Date().getUTCFullYear() - age;
	const month = String(randomInt(1, 13)).padStart(2, "0");
	const day = String(randomInt(1, 29)).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

function toGender(value: string): Gender
{
	const odds = randomInt(15);
	if (odds === 0)
	{
		return "non_binary";
	}
	if (odds === 1)
	{
		return "other";
	}
	if (value === "male")
	{
		return "man";
	}
	if (value === "female")
	{
		return "woman";
	}
	return "other";
}

function isAdult(birthDate: string): boolean
{
	if (!BIRTH_DATE_RE.test(birthDate))
	{
		return false;
	}

	const parsed = new Date(`${birthDate}T00:00:00Z`);
	if (Number.isNaN(parsed.getTime())
		|| parsed.toISOString().slice(0, 10) !== birthDate)
	{
		return false;
	}

	const limit = new Date();
	limit.setUTCFullYear(limit.getUTCFullYear() - MINIMUM_AGE);
	limit.setUTCHours(0, 0, 0, 0);

	const floor = new Date();
	floor.setUTCFullYear(floor.getUTCFullYear() - MAXIMUM_AGE);
	floor.setUTCHours(0, 0, 0, 0);

	return parsed <= limit && parsed >= floor;
}

function safeUsername(raw: string, index: number): string
{
	const suffix = String(index);
	const room = USERNAME_MAX - suffix.length - 1;
	const base = raw.toLowerCase().replace(USERNAME_RE, "").slice(0, room);
	return `${base.length === 0 ? USERNAME_FALLBACK : base}_${suffix}`;
}
