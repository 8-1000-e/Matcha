import { checkPassWord } from "./passwordPolicy";

export interface RegisterInput {
    email: string;
    username: string;
    first_name: string;
    last_name: string;
    birth_date: string;
    password: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const BIRTH_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const USERNAME_RE = /^[A-Za-z0-9._-]+$/;
const NAME_RE = /^\p{L}+(?:[ '-]\p{L}+)*$/u;
const CONTROL_RE = /\p{Cc}/u;

const MINIMUM_AGE = 18;

const EMAIL_MIN = 3;
const EMAIL_MAX = 254;
const USERNAME_MIN = 3;
const USERNAME_MAX = 32;
const NAME_MAX = 50;

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function validateRegister(body: unknown):
    { ok: true; value: RegisterInput } | { ok: false; errors: string[] }
{
	if (!isRecord(body))
	{
		return { ok: false, errors: ["invalid request body"] };
	}

	const errors: string[] = [];

	let email = "";
	if (typeof body.email !== "string")
	{
		errors.push("email is required");
	}
	else
	{
		email = body.email.trim().toLowerCase();
		if (email.length < EMAIL_MIN)
		{
			errors.push("email is too short");
		}
		else if (email.length > EMAIL_MAX)
		{
			errors.push("email is too long");
		}
		else if (CONTROL_RE.test(email) || !EMAIL_RE.test(email))
		{
			errors.push("email is invalid");
		}
	}

	let username = "";
	if (typeof body.username !== "string")
	{
		errors.push("username is required");
	}
	else
	{
		username = body.username.trim();
		if (username.length < USERNAME_MIN)
		{
			errors.push("username is too short");
		}
		else if (username.length > USERNAME_MAX)
		{
			errors.push("username is too long");
		}
		else if (!USERNAME_RE.test(username))
		{
			errors.push("username may only contain letters, digits, dot, dash and underscore");
		}
	}

	let firstName = "";
	if (typeof body.first_name !== "string")
	{
		errors.push("first name is required");
	}
	else
	{
		firstName = body.first_name.trim();
		if (firstName.length === 0)
		{
			errors.push("first name is empty");
		}
		else if (firstName.length > NAME_MAX)
		{
			errors.push("first name is too long");
		}
		else if (!NAME_RE.test(firstName))
		{
			errors.push("first name is invalid");
		}
	}

	let lastName = "";
	if (typeof body.last_name !== "string")
	{
		errors.push("last name is required");
	}
	else
	{
		lastName = body.last_name.trim();
		if (lastName.length === 0)
		{
			errors.push("last name is empty");
		}
		else if (lastName.length > NAME_MAX)
		{
			errors.push("last name is too long");
		}
		else if (!NAME_RE.test(lastName))
		{
			errors.push("last name is invalid");
		}
	}

	let birthDate = "";
	if (typeof body.birth_date !== "string")
	{
		errors.push("birth date is required");
	}
	else
	{
		const iso = body.birth_date.trim();
		if (!BIRTH_DATE_RE.test(iso))
		{
			errors.push("birth date must use the YYYY-MM-DD format");
		}
		else
		{
			const parsed = new Date(`${iso}T00:00:00Z`);

			if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== iso)
			{
				errors.push("birth date does not exist");
			}
			else
			{
				const limit = new Date();
				limit.setUTCFullYear(limit.getUTCFullYear() - MINIMUM_AGE);
				limit.setUTCHours(0, 0, 0, 0);

				const floor = new Date();
				floor.setUTCFullYear(floor.getUTCFullYear() - 120);
				floor.setUTCHours(0, 0, 0, 0);

				if (parsed > limit)
				{
					errors.push(`you must be at least ${MINIMUM_AGE} years old`);
				}
				else if (parsed < floor)
				{
					errors.push("birth date is not plausible");
				}
				else
				{
					birthDate = iso;
				}
			}
		}
	}

	let password = "";
	if (typeof body.password !== "string")
	{
		errors.push("password is required");
	}
	else
	{
		const passwordError = checkPassWord(body.password);
		if (passwordError)
		{
			errors.push(passwordError);
		}
		password = body.password;
	}

	if (errors.length > 0)
	{
		return { ok: false, errors };
	}

	return {
		ok: true,
		value: {
			email,
			username,
			first_name: firstName,
			last_name: lastName,
			birth_date: birthDate,
			password,
		},
	};
}
