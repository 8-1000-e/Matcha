import {
	detectImage,
	MAX_PHOTO_BYTES,
	normalizeImage,
} from "@/lib/profile/storage";

export const MAX_BODY_BYTES = MAX_PHOTO_BYTES + 8 * 1024;

export function tooLarge(): Response
{
	return Response.json({ errors: ["photo is too large"] }, { status: 413 });
}

function badBody(): Response
{
	return Response.json({ errors: ["invalid request body"] }, { status: 400 });
}

type BodyRead =
	| { ok: true; bytes: Uint8Array<ArrayBuffer> }
	| { ok: false; response: Response };

export async function readBoundedBody(request: Request): Promise<BodyRead>
{
	if (!request.body)
	{
		return { ok: false, response: badBody() };
	}

	const reader = request.body.getReader();
	const chunks: Uint8Array[] = [];
	let total = 0;
	try
	{
		for (;;)
		{
			const { done, value } = await reader.read();
			if (done)
			{
				break;
			}
			total += value.byteLength;
			if (total > MAX_BODY_BYTES)
			{
				await reader.cancel();
				return { ok: false, response: tooLarge() };
			}
			chunks.push(value);
		}
	}
	catch
	{
		return { ok: false, response: badBody() };
	}

	const bytes = new Uint8Array(total);
	let offset = 0;
	for (const chunk of chunks)
	{
		bytes.set(chunk, offset);
		offset += chunk.byteLength;
	}
	return { ok: true, bytes };
}

type PhotoRead =
	| { ok: true; normalized: Buffer }
	| { ok: false; response: Response };

export async function readPhotoUpload(request: Request): Promise<PhotoRead>
{
	const contentType = request.headers.get("content-type") ?? "";
	if (!contentType.toLowerCase().startsWith("multipart/form-data"))
	{
		return {
			ok: false,
			response: Response.json(
				{ errors: ["content-type must be multipart/form-data"] },
				{ status: 415 },
			),
		};
	}

	const announced = Number(request.headers.get("content-length") ?? 0);
	if (Number.isFinite(announced) && announced > MAX_BODY_BYTES)
	{
		return { ok: false, response: tooLarge() };
	}

	const body = await readBoundedBody(request);
	if (!body.ok)
	{
		return body;
	}

	let form: FormData;
	try
	{
		form = await new Response(body.bytes, {
			headers: { "content-type": contentType },
		}).formData();
	}
	catch
	{
		return { ok: false, response: badBody() };
	}

	const file = form.get("photo");
	if (!(file instanceof File) || file.size === 0)
	{
		return {
			ok: false,
			response: Response.json({ errors: ["photo is required"] }, { status: 400 }),
		};
	}
	if (file.size > MAX_PHOTO_BYTES)
	{
		return { ok: false, response: tooLarge() };
	}

	const bytes = new Uint8Array(await file.arrayBuffer());
	if (!detectImage(bytes))
	{
		return {
			ok: false,
			response: Response.json(
				{ errors: ["photo must be a jpeg, png or webp image"] },
				{ status: 400 },
			),
		};
	}

	const normalized = await normalizeImage(bytes);
	if (!normalized)
	{
		return {
			ok: false,
			response: Response.json(
				{ errors: ["photo could not be processed"] },
				{ status: 400 },
			),
		};
	}

	return { ok: true, normalized };
}
