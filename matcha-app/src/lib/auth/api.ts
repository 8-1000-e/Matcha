import { request, send, type ApiResult } from "@/lib/http/client";

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
	deleted_at: string | null;
	purge_at: string | null;
}

export type AuthResult<T> = ApiResult<T>;

function post<T>(path: string, fields: unknown): Promise<AuthResult<T>> {
	return send<T>("POST", path, fields);
}

export function register(
	fields: RegisterFields,
): Promise<AuthResult<SessionUser & { verification_email_sent: boolean }>> {
	return post<SessionUser & { verification_email_sent: boolean }>(
		"/api/auth/register",
		fields,
	);
}

export interface OauthSignupFields {
	first_name: string;
	last_name: string;
	username: string;
	birth_date: string;
}

export function completeOauthSignup(fields: OauthSignupFields): Promise<AuthResult<SessionUser>> {
	return post<SessionUser>("/api/auth/oauth/complete", fields);
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

export function me(): Promise<AuthResult<{ user: CurrentUser }>> {
	return request<{ user: CurrentUser }>("/api/auth/me", { method: "GET" });
}
