import { requireSession } from "@/lib/auth/guards";
import {
	hasProfilePhoto,
	isBlockedEitherWay,
	users,
	type UserRow,
} from "@/lib/db";

export interface TargetOptions {
	selfError: string;
	requireProfilePhoto?: boolean;
}

export type TargetResult =
	| { ok: true; viewer: UserRow; target: UserRow }
	| { ok: false; response: Response };

function fail(errors: string[], status: number): TargetResult
{
	return { ok: false, response: Response.json({ errors }, { status }) };
}

export async function requireTarget(
	targetId: string,
	options: TargetOptions,
): Promise<TargetResult>
{
	const session = await requireSession();
	if (!session.ok)
	{
		return { ok: false, response: session.response };
	}

	const viewer = session.user;
	if (targetId === viewer.id)
	{
		return fail([options.selfError], 400);
	}
	if (viewer.profile_completed !== 1)
	{
		return fail(["profile_incomplete"], 403);
	}
	if (options.requireProfilePhoto === true && !hasProfilePhoto(viewer.id))
	{
		return fail(["profile_photo_required"], 403);
	}

	const target = users.findById(targetId);
	if (
		target === undefined
		|| target.is_verified !== 1
		|| target.profile_completed !== 1
		|| isBlockedEitherWay(viewer.id, targetId)
	)
	{
		return fail(["user not found"], 404);
	}

	return { ok: true, viewer, target };
}

export async function requireModerationTarget(
	targetId: string,
	selfError: string,
): Promise<TargetResult>
{
	const session = await requireSession();
	if (!session.ok)
	{
		return { ok: false, response: session.response };
	}

	const viewer = session.user;
	if (targetId === viewer.id)
	{
		return fail([selfError], 400);
	}

	const target = users.findById(targetId);
	if (target === undefined)
	{
		return fail(["user not found"], 404);
	}

	return { ok: true, viewer, target };
}
