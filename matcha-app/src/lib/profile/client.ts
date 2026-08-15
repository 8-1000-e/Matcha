import { request, send, upload, type ApiResult } from "@/lib/http/client";

export type Gender = "woman" | "man" | "non_binary" | "other";
export type Orientation = "hetero" | "homo" | "bi" | "pan" | "other";

export interface ProfilePhoto {
	id: string;
	url: string;
	is_profile: boolean;
	position: number;
}

export interface Profile {
	id: string;
	email: string;
	username: string;
	first_name: string;
	last_name: string;
	birth_date: string;
	gender: Gender | null;
	orientation: Orientation;
	biography: string | null;
	city: string | null;
	neighborhood: string | null;
	latitude: number | null;
	longitude: number | null;
	location_consent: boolean;
	location_updated_at: string | null;
	tags: string[];
	photos: ProfilePhoto[];
	is_verified: boolean;
	profile_completed: boolean;
	missing: string[];
}

export interface ProfileFields {
	first_name?: string;
	last_name?: string;
	email?: string;
	gender?: Gender;
	orientation?: Orientation;
	biography?: string;
}

export type LocationFields =
	| { latitude: number; longitude: number }
	| { city: string }
	| {
		city: string;
		neighborhood: string | null;
		latitude: number;
		longitude: number;
	};

export interface Place {
	city: string;
	neighborhood: string | null;
	region: string | null;
	country: string | null;
	latitude: number;
	longitude: number;
}

export type PlacesResult = ApiResult<{ places: Place[] }>;
export function searchPlaces(query: string): Promise<PlacesResult> {
	return request<{ places: Place[] }>(
		`/api/profile/location/search?q=${encodeURIComponent(query)}`,
		{ method: "GET" },
	);
}

type Payload = { profile: Profile };

export type ProfileResult = ApiResult<Payload>;

export function getProfile(): Promise<ProfileResult> {
	return request<Payload>("/api/profile", { method: "GET" });
}

const SHARED_TTL_MS = 30_000;

let shared: { at: number; promise: Promise<ProfileResult> } | null = null;

export function forgetProfile(): void {
	shared = null;
}

export function sharedProfile(): Promise<ProfileResult> {
	if (shared !== null && Date.now() - shared.at < SHARED_TTL_MS) {
		return shared.promise;
	}
	const promise = getProfile();
	shared = { at: Date.now(), promise };
	return promise;
}

export function saveProfile(fields: ProfileFields): Promise<ProfileResult> {
	forgetProfile();
	return send<Payload>("PATCH", "/api/profile", fields);
}

export function saveTags(tags: string[]): Promise<ProfileResult> {
	forgetProfile();
	return send<Payload>("PUT", "/api/profile/tags", { tags });
}

export function setLocationConsent(consent: boolean): Promise<ProfileResult> {
	forgetProfile();
	return send<Payload>("PATCH", "/api/profile/location", { consent });
}

export function saveLocation(fields: LocationFields): Promise<ProfileResult> {
	forgetProfile();
	return send<Payload>("PUT", "/api/profile/location", fields);
}

export function addPhoto(file: File): Promise<ProfileResult> {
	const body = new FormData();
	body.set("photo", file);
	forgetProfile();
	return upload<Payload>("/api/profile/photos", body);
}

export function pickProfilePhoto(id: string): Promise<ProfileResult> {
	forgetProfile();
	return send<Payload>("PATCH", `/api/profile/photos/${id}`, {
		is_profile: true,
	});
}

export function removePhoto(id: string): Promise<ProfileResult> {
	forgetProfile();
	return request<Payload>(`/api/profile/photos/${id}`, { method: "DELETE" });
}
export function deleteAccount(
	password: string,
): Promise<ApiResult<{ purge_at: string; grace_days: number }>> {
	return send<{ purge_at: string; grace_days: number }>(
		"DELETE",
		"/api/profile",
		{ password },
	);
}

export function restoreAccount(): Promise<ProfileResult> {
	forgetProfile();
	return request<{ profile: Profile }>("/api/profile/restore", {
		method: "POST",
	});
}
