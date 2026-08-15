import { cookies } from "next/headers";

export async function serverFetchRaw(path: string): Promise<Response | null> {
	const jar = await cookies();
	const header = jar
		.getAll()
		.map((cookie) => `${cookie.name}=${cookie.value}`)
		.join("; ");

	if (header.length === 0) {
		return null;
	}

	try {
		return await fetch(`${process.env.APP_URL}${path}`, {
			headers: { cookie: header },
			cache: "no-store",
		});
	} catch {
		return null;
	}
}

export async function serverFetch(path: string): Promise<Response | null> {
	const response = await serverFetchRaw(path);
	if (response === null || !response.ok) {
		return null;
	}
	return response;
}
