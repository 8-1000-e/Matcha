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

const REFRESH_PATH = "/api/auth/refresh";
const RETRY_ERROR = "refresh_retry";

const SESSION_ERRORS = new Set([
	"unauthorized",
	"invalid session",
	"refresh token is required",
]);
function replayable(body: RequestInit["body"]) {
	if (!(body instanceof FormData)) {
		return () => body;
	}

	const entries = [...body.entries()];
	return () => {
		const copy = new FormData();
		for (const [name, value] of entries) {
			copy.append(name, value);
		}
		return copy;
	};
}

async function readPayload(response: Response): Promise<unknown> {
	try {
		return await response.json();
	} catch {
		return null;
	}
}

function expired(response: Response, payload: unknown): boolean {
	if (response.status !== 401) {
		return false;
	}

	const raw = (payload as { errors?: unknown } | null)?.errors;
	return (
		Array.isArray(raw)
		&& raw.some(
			(entry) =>
				typeof entry === "string"
				&& SESSION_ERRORS.has(entry.trim().toLowerCase()),
		)
	);
}
let renewal: Promise<boolean> | null = null;

function renew(): Promise<boolean> {
	renewal ??= fetch(REFRESH_PATH, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: "{}",
	})
		.then(async (response) => {
			if (response.ok) {
				return true;
			}
			return await carriesRetry(response);
		})
		.catch(() => false)
		.finally(() => {
			renewal = null;
		});

	return renewal;
}

async function carriesRetry(response: Response): Promise<boolean> {
	try {
		const payload = (await response.json()) as { errors?: unknown };
		return (
			Array.isArray(payload.errors)
			&& payload.errors.includes(RETRY_ERROR)
		);
	} catch {
		return false;
	}
}

export async function request<T>(
	path: string,
	init: RequestInit,
): Promise<ApiResult<T>> {
	const body = replayable(init.body);

	let response: Response;
	try {
		response = await fetch(path, { ...init, body: body() });
	} catch {
		return { ok: false, errors: [{ field: null, message: NETWORK_ERROR }] };
	}

	let payload = await readPayload(response);
	if (path !== REFRESH_PATH && expired(response, payload)) {
		if (!(await renew())) {
			window.location.replace("/login");
			return { ok: false, errors: readErrors(payload), code: readCode(payload) };
		}

		try {
			response = await fetch(path, { ...init, body: body() });
		} catch {
			return { ok: false, errors: [{ field: null, message: NETWORK_ERROR }] };
		}
		payload = await readPayload(response);
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