import { createHmac, timingSafeEqual } from "node:crypto";
import type { OauthDraft } from "@/components/Form/AuthForms";

export const OAUTH_DRAFT_COOKIE = "oauth_draft";

export const OAUTH_DRAFT_TTL_SECONDS = 900;

export interface OauthDraftPayload extends OauthDraft {
	provider_user_id: string;
	email_verified: boolean;
	avatar_url: string | null;
}

function secret(): string {
	const value = process.env.AUTH_SECRET;
	if (value === undefined || value.length === 0) {
		throw new Error("AUTH_SECRET is missing from the environment");
	}
	return value;
}

function sign(data: string): string {
	return createHmac("sha256", secret()).update(data).digest("base64url");
}

export function sealOauthDraft(draft: OauthDraftPayload): string {
	const body = Buffer.from(JSON.stringify(draft)).toString("base64url");

	return `${body}.${sign(body)}`;
}

function verified(raw: string): string | null {
	const dot = raw.lastIndexOf(".");
	if (dot <= 0) {
		return null;
	}

	const body = raw.slice(0, dot);
	const received = Buffer.from(raw.slice(dot + 1));
	const expected = Buffer.from(sign(body));
	if (received.length !== expected.length || !timingSafeEqual(received, expected)) {
		return null;
	}

	return Buffer.from(body, "base64url").toString("utf8");
}

export function openOauthDraft(raw: string | undefined): OauthDraftPayload | null {
	if (raw === undefined) {
		return null;
	}

	const json = verified(raw);
	if (json === null) {
		return null;
	}

	let parsed: unknown;
	try {
		parsed = JSON.parse(json);
	} catch {
		return null;
	}

	if (typeof parsed !== "object" || parsed === null) {
		return null;
	}

	const draft = parsed as Partial<OauthDraftPayload>;
	if (
		typeof draft.provider !== "string"
		|| typeof draft.provider_user_id !== "string"
		|| typeof draft.providerName !== "string"
		|| typeof draft.email !== "string"
		|| typeof draft.username !== "string"
		|| typeof draft.first_name !== "string"
		|| typeof draft.last_name !== "string"
	) {
		return null;
	}

	return {
		provider: draft.provider,
		provider_user_id: draft.provider_user_id,
		providerName: draft.providerName,
		email: draft.email,
		username: draft.username,
		first_name: draft.first_name,
		last_name: draft.last_name,
		email_verified: draft.email_verified === true,
		avatar_url: typeof draft.avatar_url === "string" ? draft.avatar_url : null,
	};
}

export function readOauthDraft(raw: string | undefined): OauthDraft | null {
	const draft = openOauthDraft(raw);
	if (draft === null) {
		return null;
	}

	return {
		provider: draft.provider,
		providerName: draft.providerName,
		email: draft.email,
		username: draft.username,
		first_name: draft.first_name,
		last_name: draft.last_name,
	};
}
