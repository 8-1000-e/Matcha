export type BodyResult =
	| { ok: true; value: unknown }
	| { ok: false; response: Response };

export async function readJsonBody(request: Request): Promise<BodyResult>
{
	const contentType = request.headers.get("content-type") ?? "";
	if (!contentType.toLowerCase().startsWith("application/json"))
	{
		return {
			ok: false,
			response: Response.json(
				{ errors: ["content-type must be application/json"] },
				{ status: 415 },
			),
		};
	}

	let raw: string;
	try
	{
		raw = await request.text();
	}
	catch
	{
		return {
			ok: false,
			response: Response.json({ errors: ["invalid request body"] }, { status: 400 }),
		};
	}

	try
	{
		return { ok: true, value: JSON.parse(raw) };
	}
	catch
	{
		return {
			ok: false,
			response: Response.json({ errors: ["invalid json body"] }, { status: 400 }),
		};
	}
}