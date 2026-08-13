import { requireSession } from "@/lib/auth/guards";
import { findTagsByLabels, setUserTags } from "@/lib/db";
import { readJsonBody } from "@/lib/http/body";
import { profileResponse } from "@/lib/profile/profile";
import { validateTags } from "@/lib/profile/validation";

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

	const result = validateTags(body.value);
	if (!result.ok)
	{
		return Response.json({ errors: result.errors }, { status: 400 });
	}

	const found = findTagsByLabels(result.value);
	if (found.length !== result.value.length)
	{
		return Response.json(
			{ errors: ["one or more tags do not exist"] },
			{ status: 400 },
		);
	}

	setUserTags(session.user.id, found.map((tag) => tag.id));

	return profileResponse(session.user.id);
}
