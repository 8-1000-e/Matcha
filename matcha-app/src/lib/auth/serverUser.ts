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
