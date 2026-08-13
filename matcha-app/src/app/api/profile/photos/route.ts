import { requireSession } from "@/lib/auth/guards";
import { addPhoto, createId, MAX_PHOTOS_PER_USER, photos } from "@/lib/db";
import { profileResponse } from "@/lib/profile/profile";
import {
	detectImage,
	MAX_PHOTO_BYTES,
	normalizeImage,
	removePhotoFile,
	STORED_EXTENSION,
	writePhotoFile,
} from "@/lib/profile/storage";

// Marge laissee a l'enveloppe multipart (frontieres et en-tetes de partie)
// pour qu'un fichier pesant exactement MAX_PHOTO_BYTES reste acceptable.
const MAX_BODY_BYTES = MAX_PHOTO_BYTES + 8 * 1024;

type BodyRead =
	| { ok: true; bytes: Uint8Array<ArrayBuffer> }
	| { ok: false; response: Response };

function tooLarge(): Response
{
	return Response.json({ errors: ["photo is too large"] }, { status: 413 });
}

// Le corps est lu par morceaux et la lecture est interrompue des le
// depassement : un corps enorme n'est jamais mis en memoire en entier.
async function readBoundedBody(request: Request): Promise<BodyRead>
{
	if (!request.body)
	{
		return {
			ok: false,
			response: Response.json({ errors: ["invalid request body"] }, { status: 400 }),
		};
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
		return {
			ok: false,
			response: Response.json({ errors: ["invalid request body"] }, { status: 400 }),
		};
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

export async function POST(request: Request)
{
	const session = await requireSession();
	if (!session.ok)
	{
		return session.response;
	}

	const contentType = request.headers.get("content-type") ?? "";
	if (!contentType.toLowerCase().startsWith("multipart/form-data"))
	{
		return Response.json(
			{ errors: ["content-type must be multipart/form-data"] },
			{ status: 415 },
		);
	}

	const announced = Number(request.headers.get("content-length") ?? 0);
	if (Number.isFinite(announced) && announced > MAX_BODY_BYTES)
	{
		return tooLarge();
	}

	if (photos.count({ user_id: session.user.id }) >= MAX_PHOTOS_PER_USER)
	{
		return Response.json({ errors: ["photo limit reached"] }, { status: 409 });
	}

	const body = await readBoundedBody(request);
	if (!body.ok)
	{
		return body.response;
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
		return Response.json({ errors: ["invalid request body"] }, { status: 400 });
	}

	const file = form.get("photo");
	if (!(file instanceof File) || file.size === 0)
	{
		return Response.json({ errors: ["photo is required"] }, { status: 400 });
	}
	if (file.size > MAX_PHOTO_BYTES)
	{
		return tooLarge();
	}

	const bytes = new Uint8Array(await file.arrayBuffer());
	if (!detectImage(bytes))
	{
		return Response.json(
			{ errors: ["photo must be a jpeg, png or webp image"] },
			{ status: 400 },
		);
	}

	const normalized = await normalizeImage(bytes);
	if (!normalized)
	{
		return Response.json(
			{ errors: ["photo could not be processed"] },
			{ status: 400 },
		);
	}

	const name = `${createId()}.${STORED_EXTENSION}`;
	await writePhotoFile(name, normalized);

	try
	{
		if (addPhoto(session.user.id, name) === null)
		{
			await removePhotoFile(name);
			return Response.json({ errors: ["photo limit reached"] }, { status: 409 });
		}
	}
	catch (error)
	{
		await removePhotoFile(name);
		throw error;
	}

	return profileResponse(session.user.id, 201);
}
