import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const TTL_MAX = 365 * 24 * 60 * 60;
const DECIMAL_RE = /^\d+$/;

function readTtl(name: string, fallback: number): number {
	const raw = process.env[name];
	if (raw === undefined || raw.length === 0)
	{
		return fallback;
	}

	if (!DECIMAL_RE.test(raw))
	{
		throw new Error(`${name} must be a positive integer, got "${raw}"`);
	}

	const parsed = Number(raw);
	if (parsed <= 0 || parsed > TTL_MAX)
	{
		throw new Error(`${name} must be between 1 and ${TTL_MAX}, got "${raw}"`);
	}
	return parsed;
}

export const ACCESS_TTL = readTtl("ACCESS_TOKEN_TTL", 900);
export const REFRESH_TTL = readTtl("REFRESH_TOKEN_TTL", 2592000);
export const EMAIL_TTL = readTtl("EMAIL_TOKEN_TTL", 900);

const ALGORITHM = "HS256";

const SECRET = readSecret();

function readSecret(): string {
	const secret = process.env.AUTH_SECRET;
	if (secret === undefined || secret.length === 0)
	{
		throw new Error("AUTH_SECRET is missing from the environment");
	}
	return secret;
}

export interface AccessPayload {
    sub: string;
    iat: number;
    exp: number;
}

function sign(data: string): string {
	return createHmac("sha256", SECRET).update(data).digest("base64url");
}

export function hashToken(token: string): string
{
	return createHash("sha256").update(token).digest("hex");
}

export function createRefreshToken(): { token: string; hash: string; expiresAt: string }
{
	const rdmBytes = randomBytes(32).toString("base64url");
	const bytesHash = hashToken(rdmBytes);
	const expiresAt = new Date(Date.now() + REFRESH_TTL * 1000).toISOString();
	return { token: rdmBytes, hash: bytesHash, expiresAt };
}

export function createEmailToken(): { token: string; hash: string; expiresAt: string }
{
	const rdmBytes = randomBytes(32).toString("base64url");
	const bytesHash = hashToken(rdmBytes);
	const expiresAt = new Date(Date.now() + EMAIL_TTL * 1000).toISOString();
	return { token: rdmBytes, hash: bytesHash, expiresAt };
}

export function signAccessToken(userId: string): string
{
	const now = Math.floor(Date.now() / 1000);
	const header = Buffer.from(JSON.stringify({ alg: ALGORITHM, typ: "JWT" })).toString("base64url");
	const payload = Buffer.from(JSON.stringify({
		sub: userId,
		iat: now,
		exp: now + ACCESS_TTL,
		jti: randomBytes(9).toString("base64url"),
	})).toString("base64url");
	return `${header}.${payload}.${sign(`${header}.${payload}`)}`;
}

export function verifyAccessToken(token: string): AccessPayload | null
{
	const parts = token.split(".");
	if (parts.length !== 3)
	{
		return null;
	}

	const [header, payload, signature] = parts;

	const expected = Buffer.from(sign(`${header}.${payload}`));
	const received = Buffer.from(signature);
	if (expected.length !== received.length || !timingSafeEqual(expected, received))
	{
		return null;
	}

	let decodedHeader: unknown;
	let decodedPayload: unknown;
	try {
		decodedHeader = JSON.parse(Buffer.from(header, "base64url").toString("utf8"));
		decodedPayload = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
	}
	catch {
		return null;
	}

	if (typeof decodedHeader !== "object" || decodedHeader === null
        || typeof decodedPayload !== "object" || decodedPayload === null)
	{
		return null;
	}

	if ((decodedHeader as { alg?: unknown }).alg !== ALGORITHM)
	{
		return null;
	}

	const { sub, iat, exp } = decodedPayload as Record<string, unknown>;

	if (typeof sub !== "string" || sub.length === 0)
	{
		return null;
	}
	if (typeof iat !== "number" || typeof exp !== "number")
	{
		return null;
	}
	if (!Number.isSafeInteger(iat) || !Number.isSafeInteger(exp))
	{
		return null;
	}
	if (exp <= Math.floor(Date.now() / 1000))
	{
		return null;
	}

	return { sub, iat, exp };
}