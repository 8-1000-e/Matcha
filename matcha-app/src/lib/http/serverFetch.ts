import { cookies } from "next/headers";

function origin(): string {
	return (
		process.env.INTERNAL_URL
		?? `http://127.0.0.1:${process.env.PORT ?? "3000"}`
	);
}

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
		return await fetch(`${origin()}${path}`, {
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
