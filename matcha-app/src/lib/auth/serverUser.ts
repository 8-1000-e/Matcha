import { redirect } from "next/navigation";
import { serverFetch } from "@/lib/http/serverFetch";
import type { CurrentUser } from "./api";

export async function fetchCurrentUser(): Promise<CurrentUser | null> {
	const response = await serverFetch("/api/auth/me");
	if (!response) {
		return null;
	}

	const payload = (await response.json()) as { user?: CurrentUser };
	return payload.user ?? null;
}

export async function redirectIfSignedIn(): Promise<void> {
	const user = await fetchCurrentUser();
	if (!user) {
		return;
	}
	if (!user.is_verified) {
		redirect("/verify-email");
	}
	if (user.missing.length > 0) {
		redirect("/complete-profile");
	}
	redirect("/me");
}
