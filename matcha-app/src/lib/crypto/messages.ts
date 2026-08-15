import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const PREFIX = "v1";
const IV_BYTES = 12;
const KEY_RE = /^[0-9a-f]{64}$/i;

let cached: Buffer | null = null;

function key(): Buffer {
	if (cached !== null) {
		return cached;
	}

	const raw = process.env.MESSAGES_KEY ?? "";
	if (!KEY_RE.test(raw)) {
		throw new Error(
			"MESSAGES_KEY must be 32 bytes in hexadecimal - openssl rand -hex 32",
		);
	}

	cached = Buffer.from(raw, "hex");
	return cached;
}

export function isEncrypted(stored: string): boolean {
	return stored.startsWith(`${PREFIX}:`);
}

export function encryptMessage(text: string): string {
	const iv = randomBytes(IV_BYTES);
	const cipher = createCipheriv(ALGORITHM, key(), iv);
	const body = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);

	return [
		PREFIX,
		iv.toString("base64url"),
		cipher.getAuthTag().toString("base64url"),
		body.toString("base64url"),
	].join(":");
}

export function decryptMessage(stored: string): string {
	if (!isEncrypted(stored)) {
		return stored;
	}

	const [, iv, tag, body] = stored.split(":");
	if (iv === undefined || tag === undefined || body === undefined) {
		throw new Error("message is malformed");
	}

	const decipher = createDecipheriv(
		ALGORITHM,
		key(),
		Buffer.from(iv, "base64url"),
	);
	decipher.setAuthTag(Buffer.from(tag, "base64url"));

	return Buffer.concat([
		decipher.update(Buffer.from(body, "base64url")),
		decipher.final(),
	]).toString("utf8");
}
