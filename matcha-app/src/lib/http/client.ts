import {
	GENERIC_ERROR,
	NETWORK_ERROR,
	translateError,
	type AuthError,
} from "@/lib/auth/errorMessages";

export type ApiResult<T> =
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

export async function request<T>(
	path: string,
	init: RequestInit,
): Promise<ApiResult<T>> {
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

export function send<T>(
	method: string,
	path: string,
	fields: unknown,
): Promise<ApiResult<T>> {
	return request<T>(path, {
		method,
		headers: { "content-type": "application/json" },
		body: JSON.stringify(fields),
	});
}

export function upload<T>(path: string, body: FormData): Promise<ApiResult<T>> {
	return request<T>(path, { method: "POST", body });
}
