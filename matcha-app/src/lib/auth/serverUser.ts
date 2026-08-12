import { cookies } from "next/headers";
import type { CurrentUser } from "./api";

export async function fetchCurrentUser(): Promise<CurrentUser | null> {
	const jar = await cookies();
	const header = jar
		.getAll()
		.map((cookie) => `${cookie.name}=${cookie.value}`)
		.join("; ");

	if (header.length === 0) {
		return null;
	}

	let response: Response;
	try {
		response = await fetch(`${process.env.APP_URL}/api/auth/me`, {
			headers: { cookie: header },
			cache: "no-store",
		});
	} catch {
		return null;
	}

	if (!response.ok) {
		return null;
	}

	const payload = (await response.json()) as { user?: CurrentUser };
	return payload.user ?? null;
}
