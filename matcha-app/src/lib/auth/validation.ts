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

const MINIMUM_AGE = 18;

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

export function validateRegister(body: unknown):
    { ok: true; value: RegisterInput } | { ok: false; errors: string[] }
{
    if (!isRecord(body))
        return { ok: false, errors: ["invalid request body"] };

    const errors: string[] = [];

    let email = "";
    if (typeof body.email !== "string") 
        errors.push("email is required");
    else 
    {
        email = body.email.trim().toLowerCase();
        if (email.length === 0)
            errors.push("email is empty");
        else if (email.length > 255)
            errors.push("email is too long");
        else if (!EMAIL_RE.test(email))
            errors.push("email is invalid");
    }

    // --- username ---
    let username = "";
    if (typeof body.username !== "string")
        errors.push("username is required")
    else
    {
        username = body.username;
        if (username.length === 0)
            errors.push("username is empty");
        else if (username.length > 30)
            errors.push("username is too long");
    }

    let firstName = "";
    if (typeof body.first_name !== "string")
        errors.push("firstName is required")
    else
    {
        firstName = body.first_name;
        if (firstName.length === 0)
            errors.push("firstName is empty");
        else if (firstName.length > 50)
            errors.push("firstName is too long");
    }

    let lastName = "";
    if (typeof body.last_name !== "string")
        errors.push("lastName is required")
    else
    {
        lastName = body.last_name;
        if (lastName.length === 0)
            errors.push("lastName is empty");
        else if (lastName.length > 50)
            errors.push("lastName is too long");
    }

    let birthDate = "";
    if (typeof body.birth_date !== "string")
        errors.push("birth date is required");
    else
    {
        const iso = body.birth_date.trim();
        if (!BIRTH_DATE_RE.test(iso))
            errors.push("birth date must use the YYYY-MM-DD format");
        else
        {
            const parsed = new Date(`${iso}T00:00:00Z`);

            if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== iso)
                errors.push("birth date does not exist");
            else
            {
                const limit = new Date();
                limit.setUTCFullYear(limit.getUTCFullYear() - MINIMUM_AGE);
                limit.setUTCHours(0, 0, 0, 0);
                if (parsed > limit)
                    errors.push(`you must be at least ${MINIMUM_AGE} years old`);
                else
                    birthDate = iso;
            }
        }
    }

    let password = "";
    let passwordError = null;
    if (typeof body.password !== "string")
        errors.push("password is required");
    else
    {
        passwordError = checkPassWord(body.password);
        if (passwordError)
            errors.push(passwordError);
        password = body.password;
    }

    if (errors.length > 0)
        return { ok: false, errors };

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
