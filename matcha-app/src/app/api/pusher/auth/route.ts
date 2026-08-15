import { requireSession } from "@/lib/auth/guards";
import {
	findActiveMatchForUsers,
	isBlockedEitherWay,
	type UserRow,
} from "@/lib/db";
import { authorizeChannel, chatChannel, userChannel } from "@/lib/realtime/server";

const CHAT_PREFIX = "private-chat-";

function forbidden(): Response
{
	return Response.json({ errors: ["forbidden"] }, { status: 403 });
}

function allowed(user: UserRow, channel: string): boolean
{
	if (channel === userChannel(user.id))
	{
		return true;
	}
	if (!channel.startsWith(CHAT_PREFIX))
	{
		return false;
	}

	const matchId = channel.slice(CHAT_PREFIX.length);
	if (chatChannel(matchId) !== channel)
	{
		return false;
	}

	const match = findActiveMatchForUsers(matchId, user.id);
	if (match === undefined)
	{
		return false;
	}

	const partnerId
		= match.user_a_id === user.id ? match.user_b_id : match.user_a_id;
	return !isBlockedEitherWay(user.id, partnerId);
}

export async function POST(request: Request)
{
	const session = await requireSession();
	if (!session.ok)
	{
		return session.response;
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

	const socketId = form.get("socket_id");
	const channel = form.get("channel_name");
	if (typeof socketId !== "string" || socketId.length === 0
		|| typeof channel !== "string" || channel.length === 0)
	{
		return Response.json(
			{ errors: ["socket_id and channel_name are required"] },
			{ status: 400 },
		);
	}

	if (!allowed(session.user, channel))
	{
		return forbidden();
	}

	const authorization = authorizeChannel(socketId, channel);
	if (authorization === null)
	{
		return Response.json({ errors: ["realtime_unavailable"] }, { status: 503 });
	}

	return Response.json(authorization);
}
