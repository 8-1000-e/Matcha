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

export interface SessionUser {
	id: string;
	username: string;
}

export type AuthResult<T> =
	| { ok: true; data: T }
	| { ok: false; errors: AuthError[] };

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

async function post<T>(path: string, fields: unknown): Promise<AuthResult<T>> {
	let response: Response;
	try {
		response = await fetch(path, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify(fields),
		});
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
		return { ok: false, errors: readErrors(payload) };
	}

	return { ok: true, data: payload as T };
}

export function register(
	fields: RegisterFields,
): Promise<AuthResult<SessionUser>> {
	return post<SessionUser>("/api/auth/register", fields);
}

export function login(
	fields: LoginFields,
): Promise<AuthResult<{ user: SessionUser }>> {
	return post<{ user: SessionUser }>("/api/auth/login", fields);
}

export function logout(): Promise<AuthResult<{ ok: true }>> {
	return post<{ ok: true }>("/api/auth/logout", {});
}
