import {
	GENERIC_ERROR,
	NETWORK_ERROR,
	translateError,
	type AuthError,
} from "./errorMessages";

export interface RegisterFields {
	email: string;
	username: string;
	first_name: string;
	last_name: string;
	birth_date: string;
	password: string;
}

export interface LoginFields {
	username: string;
	password: string;
}

export interface ResetFields {
	token: string;
	password: string;
}

export interface SessionUser {
	id: string;
	username: string;
}

export interface CurrentUser extends SessionUser {
	first_name: string;
	last_name: string;
	is_verified: boolean;
	profile_completed: boolean;
	missing: string[];
}

export type AuthResult<T> =
	| { ok: true; data: T }
	| { ok: false; errors: AuthError[]; code?: string };

function fallback(): AuthError[] {
	return [{ field: null, message: GENERIC_ERROR }];
}

function readErrors(payload: unknown): AuthError[] {
	if (typeof payload !== "object" || payload === null) {
		return fallback();
	}

	const raw = (payload as { errors?: unknown }).errors;
	if (!Array.isArray(raw)) {
		return fallback();
	}

	const translated = raw
		.filter((entry): entry is string => typeof entry === "string")
		.map(translateError);

	return translated.length > 0 ? translated : fallback();
}

function readCode(payload: unknown): string | undefined {
	if (typeof payload !== "object" || payload === null) {
		return undefined;
	}

	const code = (payload as { code?: unknown }).code;
	return typeof code === "string" ? code : undefined;
}

async function request<T>(
	path: string,
	init: RequestInit,
): Promise<AuthResult<T>> {
	let response: Response;
	try {
		response = await fetch(path, init);
	} catch {
		return { ok: false, errors: [{ field: null, message: NETWORK_ERROR }] };
	}

	let payload: unknown = null;
	try {
		payload = await response.json();
	} catch {
		payload = null;
	}

	if (!response.ok) {
		return {
			ok: false,
			errors: readErrors(payload),
			code: readCode(payload),
		};
	}

	return { ok: true, data: payload as T };
}

function post<T>(path: string, fields: unknown): Promise<AuthResult<T>> {
	return request<T>(path, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify(fields),
	});
}

export function register(
	fields: RegisterFields,
): Promise<AuthResult<SessionUser>> {
	return post<SessionUser>("/api/auth/register", fields);
}

export function login(
	fields: LoginFields,
): Promise<AuthResult<{ user: SessionUser & { is_verified: boolean } }>> {
	return post<{ user: SessionUser & { is_verified: boolean } }>(
		"/api/auth/login",
		fields,
	);
}

export function logout(): Promise<AuthResult<{ ok: true }>> {
	return post<{ ok: true }>("/api/auth/logout", {});
}

export function refresh(): Promise<AuthResult<{ ok: true }>> {
	return post<{ ok: true }>("/api/auth/refresh", {});
}

export function resendVerification(
	email: string,
): Promise<AuthResult<{ ok: true }>> {
	return post<{ ok: true }>("/api/auth/verify/resend", { email });
}

export function requestPasswordReset(
	email: string,
): Promise<AuthResult<{ ok: true }>> {
	return post<{ ok: true }>("/api/auth/password/forgot", { email });
}

export function resetPassword(
	fields: ResetFields,
): Promise<AuthResult<{ ok: true }>> {
	return post<{ ok: true }>("/api/auth/password/reset", fields);
}

export async function me(): Promise<AuthResult<{ user: CurrentUser }>> {
	const current = await request<{ user: CurrentUser }>("/api/auth/me", {
		method: "GET",
	});
	if (current.ok) {
		return current;
	}

	const renewed = await refresh();
	if (!renewed.ok) {
		return current;
	}

	return request<{ user: CurrentUser }>("/api/auth/me", { method: "GET" });
}
