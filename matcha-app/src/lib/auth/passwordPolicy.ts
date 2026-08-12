import { readFileSync } from "node:fs";
import { join } from "node:path";

const WORDS = new Set(
	readFileSync(join(process.cwd(), "data", "frequent-english-words.csv"), "utf8")
		.split("\n")
		.slice(1)
		.map((w) => w.trim().toLowerCase())
		.filter((w) => w.length > 0),
);

const MIN_LENGTH = 8;
const MAX_BYTES = 72;
const CONTROL_RE = /\p{Cc}/u;

export type PasswordError =
    | "too_short"
    | "too_long"
    | "control_char"
    | "english_word"
    | "no_number"
    | "no_special_char"
    | null;

export function checkPassWord(password: string): PasswordError
{
	if (CONTROL_RE.test(password))
	{
		return "control_char";
	}

	if ([...password].length < MIN_LENGTH)
	{
		return "too_short";
	}

	if (Buffer.byteLength(password, "utf8") > MAX_BYTES)
	{
		return "too_long";
	}

	const lower = password.toLowerCase();
	for (const word of WORDS)
	{
		if (lower.includes(word))
		{
			return "english_word";
		}
	}

	if (!/[0-9]/.test(password))
	{
		return "no_number";
	}

	if (!/[^a-zA-Z0-9]/.test(password))
	{
		return "no_special_char";
	}

	return null;
}
