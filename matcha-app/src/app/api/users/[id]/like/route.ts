import { requireSession } from "@/lib/auth/guards";
import {
	hasProfilePhoto,
	isBlockedEitherWay,
	like,
	unlike,
	users,
} from "@/lib/db";

type Context = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: Context)
{
	const session = await requireSession();
	if (!session.ok)
	{
		return session.response;
	}

	const { id } = await context.params;
	const viewer = session.user;

	if (id === viewer.id)
	{
		return Response.json({ errors: ["cannot like yourself"] }, { status: 400 });
	}
	if (!hasProfilePhoto(viewer.id))
	{
		return Response.json({ errors: ["profile_photo_required"] }, { status: 403 });
	}

	const target = users.findById(id);
	if (target === undefined || target.profile_completed !== 1
		|| isBlockedEitherWay(viewer.id, id))
	{
		return Response.json({ errors: ["user not found"] }, { status: 404 });
	}

	const outcome = like(viewer.id, id);

	return Response.json({ liked: outcome.liked, matched: outcome.matched });
}

export async function DELETE(_request: Request, context: Context)
{
	const session = await requireSession();
	if (!session.ok)
	{
		return session.response;
	}

	const { id } = await context.params;
	const removed = unlike(session.user.id, id);

	return Response.json({ removed });
}
