import bcrypt from "bcrypt";

export async function hashPassword(password: string): Promise<string>
{
    const stored = await bcrypt.hash(password, 12);
    return stored;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean>
{
    return await bcrypt.compare(password, stored);
}