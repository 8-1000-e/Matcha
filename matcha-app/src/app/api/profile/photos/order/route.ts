import { requireSession } from "@/lib/auth/guards";
import { DatabaseError, reorderPhotos } from "@/lib/db";
import { readJsonBody } from "@/lib/http/body";
import { profileResponse } from "@/lib/profile/profile";
import { validatePhotoOrder } from "@/lib/profile/validation";

export async function PUT(request: Request)
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

	const result = validatePhotoOrder(body.value);
	if (!result.ok)
	{
		return Response.json({ errors: result.errors }, { status: 400 });
	}

	try
	{
		reorderPhotos(session.user.id, result.value);
	}
	catch (error)
	{
		if (error instanceof DatabaseError)
		{
			return Response.json(
				{ errors: ["photo order does not match your photos"] },
				{ status: 400 },
			);
		}
		throw error;
	}

	return profileResponse(session.user.id);
}
