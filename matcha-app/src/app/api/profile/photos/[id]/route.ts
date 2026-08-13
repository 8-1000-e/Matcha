import { requireSession } from "@/lib/auth/guards";
import { DatabaseError, photos, removePhoto, setProfilePhoto } from "@/lib/db";
import { readJsonBody } from "@/lib/http/body";
import { profileResponse } from "@/lib/profile/profile";
import { removePhotoFile } from "@/lib/profile/storage";
import { validateProfilePhoto } from "@/lib/profile/validation";

interface Context {
	params: Promise<{ id: string }>;
}

function notFound(): Response
{
	return Response.json({ errors: ["photo not found"] }, { status: 404 });
}

export async function PATCH(request: Request, context: Context)
{
	const session = await requireSession();
	if (!session.ok)
	{
		return session.response;
	}

	const body = await readJsonBody(request);
	if (!body.ok)
	{
		return body.response;
	}

	const result = validateProfilePhoto(body.value);
	if (!result.ok)
	{
		return Response.json({ errors: result.errors }, { status: 400 });
	}

	const { id } = await context.params;
	try
	{
		setProfilePhoto(session.user.id, id);
	}
	catch (error)
	{
		if (error instanceof DatabaseError)
		{
			return notFound();
		}
		throw error;
	}

	return profileResponse(session.user.id);
}

export async function DELETE(_request: Request, context: Context)
{
	const session = await requireSession();
	if (!session.ok)
	{
		return session.response;
	}

	const { id } = await context.params;
	const photo = photos.findOne({ id, user_id: session.user.id });
	if (!photo)
	{
		return notFound();
	}

	if (!removePhoto(session.user.id, id))
	{
		return notFound();
	}

	await removePhotoFile(photo.path);

	return profileResponse(session.user.id);
}
