import { readFileSync } from "node:fs"

const WORDS = new Set(
    readFileSync("data/frequent-english-words.csv", "utf8").split("\n").slice(1).map((w) => w.trim()).filter((w) => w.length > 0)
)

type PasswordError = "too_short" | "english_word" | "no_number" | "no_special_char" | "too_long" | null;

export function checkPassWord(password: string): PasswordError
{
    if (password.length < 8)
        return "too_short";
    if (password.length > 72)
        return "too_long";

    password = password.toLowerCase();
    for (const word of WORDS)
    {
        if (password.includes(word))
            return "english_word";
    }

    if (!/[0-9]/.test(password))
        return "no_number";

    if (!/[^a-zA-Z0-9]/.test(password))
        return "no_special_char";

    return null;
}