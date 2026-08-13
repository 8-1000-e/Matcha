import { cookies } from "next/headers";

export async function serverFetch(path: string): Promise<Response | null> {
	const jar = await cookies();
	const header = jar
		.getAll()
		.map((cookie) => `${cookie.name}=${cookie.value}`)
		.join("; ");

	if (header.length === 0) {
		return null;
	}

	try {
		const response = await fetch(`${process.env.APP_URL}${path}`, {
			headers: { cookie: header },
			cache: "no-store",
		});
		return response.ok ? response : null;
	} catch {
		return null;
	}
}
