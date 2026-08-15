import { NextResponse, type NextRequest } from "next/server";

function readName(raw: string) {
	const pair = raw.split(";")[0] ?? "";
	const separator = pair.indexOf("=");
	if (separator < 1) {
		return null;
	}
	return { name: pair.slice(0, separator).trim(), value: pair.slice(separator + 1) };
}

export async function proxy(request: NextRequest) {
	if (request.cookies.get("access")) {
		return NextResponse.next();
	}

	const login = NextResponse.redirect(new URL("/login", request.url));
	if (!request.cookies.get("refresh")) {
		return login;
	}

	let renewed: Response;
	try {
		renewed = await fetch(new URL("/api/auth/refresh", request.url), {
			method: "POST",
			headers: {
				"content-type": "application/json",
				cookie: request.headers.get("cookie") ?? "",
			},
			body: "{}",
		});
	} catch {
		return login;
	}

	if (!renewed.ok) {
		return login;
	}

	const jar = renewed.headers.getSetCookie();
	for (const raw of jar) {
		const cookie = readName(raw);
		if (cookie) {
			request.cookies.set(cookie.name, cookie.value);
		}
	}

	const response = NextResponse.next({ request });
	for (const raw of jar) {
		response.headers.append("set-cookie", raw);
	}
	return response;
}

export const config = {
	matcher: ["/me", "/feed", "/verify-email", "/complete-profile"],
};
