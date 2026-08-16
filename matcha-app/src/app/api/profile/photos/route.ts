import { requireSession } from "@/lib/auth/guards";
import { addPhoto, createId, MAX_PHOTOS_PER_USER, photos } from "@/lib/db";
import { profileResponse } from "@/lib/profile/profile";
import {
	removePhotoFile,
	STORED_EXTENSION,
	writePhotoFile,
} from "@/lib/profile/storage";
import { readPhotoUpload } from "@/lib/profile/upload";

export async function POST(request: Request)
{
	const session = await requireSession();
	if (!session.ok)
	{
		return session.response;
	}

	if (photos.count({ user_id: session.user.id }) >= MAX_PHOTOS_PER_USER)
	{
		return Response.json({ errors: ["photo limit reached"] }, { status: 409 });
	}

	const upload = await readPhotoUpload(request);
	if (!upload.ok)
	{
		return upload.response;
	}
	const normalized = upload.normalized;

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