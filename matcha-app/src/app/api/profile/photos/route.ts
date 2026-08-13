import { requireSession } from "@/lib/auth/guards";
import {
	addPhoto,
	createId,
	DatabaseError,
	MAX_PHOTOS_PER_USER,
	photos,
} from "@/lib/db";
import { profileResponse } from "@/lib/profile/profile";
import { detectImage, MAX_PHOTO_BYTES, removePhotoFile, writePhotoFile } from "@/lib/profile/storage";

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
	if (Number.isFinite(announced) && announced > MAX_PHOTO_BYTES)
	{
		return Response.json({ errors: ["photo is too large"] }, { status: 413 });
	}

	if (photos.count({ user_id: session.user.id }) >= MAX_PHOTOS_PER_USER)
	{
		return Response.json({ errors: ["photo limit reached"] }, { status: 409 });
	}

	let form: FormData;
	try
	{
		form = await request.formData();
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
		return Response.json({ errors: ["photo is too large"] }, { status: 413 });
	}

	const bytes = new Uint8Array(await file.arrayBuffer());
	const kind = detectImage(bytes);
	if (!kind)
	{
		return Response.json(
			{ errors: ["photo must be a jpeg, png or webp image"] },
			{ status: 400 },
		);
	}

	const name = `${createId()}.${kind.extension}`;
	await writePhotoFile(name, bytes);

	try
	{
		addPhoto(session.user.id, name);
	}
	catch (error)
	{
		await removePhotoFile(name);
		if (error instanceof DatabaseError)
		{
			return Response.json({ errors: ["photo limit reached"] }, { status: 409 });
		}
		throw error;
	}

	return profileResponse(session.user.id, 201);
}
