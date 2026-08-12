import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const ACCESS_TTL = Number(process.env.ACCESS_TOKEN_TTL ?? 900);
const REFRESH_TTL = Number(process.env.REFRESH_TOKEN_TTL ?? 2592000);

export interface AccessPayload {
    sub: string;
    iat: number;
    exp: number;
}

function getSecret(): string {
    const secret = process.env.AUTH_SECRET;
    if (secret === undefined || secret.length === 0)
        throw new Error("AUTH_SECRET is missing from the environment");
    return secret;
}

function sign(data: string): string {
    return createHmac("sha256", getSecret()).update(data).digest("base64url");
}

export function hashRefreshToken(token: string): string
{
    return createHash("sha256").update(token).digest("hex");
}

export function createRefreshToken(): { token: string; hash: string; expiresAt: string }
{
    const rdmBytes = randomBytes(32).toString("base64url");
    const bytesHash = hashRefreshToken(rdmBytes);
    const expiresAt = new Date(Date.now() + REFRESH_TTL * 1000).toISOString();
    return { token: rdmBytes, hash: bytesHash, expiresAt };
}


export function signAccessToken(userId: string): string
{
    const now = Math.floor(Date.now() / 1000);
    const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
    const payload = Buffer.from(JSON.stringify({
        sub: userId,
        iat: now,
        exp: now + ACCESS_TTL,
    })).toString("base64url");
    return `${header}.${payload}.${sign(`${header}.${payload}`)}`;
}

export function verifyAccessToken(token: string): AccessPayload | null
{
    const parts = token.split(".");
    if (parts.length !== 3)
        return null;

    const [header, payload, signature] = parts;

    const expected = Buffer.from(sign(`${header}.${payload}`));
    const received = Buffer.from(signature);
    if (expected.length !== received.length || !timingSafeEqual(expected, received))
        return null;

    let payloadObj: AccessPayload;
    try {
        payloadObj = JSON.parse(
            Buffer.from(payload, "base64url").toString("utf8"),
        ) as AccessPayload;
    }
    catch {
        return null;
    }

    if (typeof payloadObj.sub !== "string" || typeof payloadObj.exp !== "number")
        return null;

    if (payloadObj.exp < Math.floor(Date.now() / 1000))
        return null;

    return payloadObj;
}
