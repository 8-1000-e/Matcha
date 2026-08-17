import { requireAnySession, requireSession } from "@/lib/auth/guards";
import {
	countUnreadMessages,
	countUnreadNotifications,
	listNotifications,
	markAllNotificationsRead,
} from "@/lib/db";
import { readJsonBody } from "@/lib/http/body";
import { serializeNotification } from "@/lib/notifications/notifications";
import { validateRead } from "@/lib/notifications/validation";
import { userChannel } from "@/lib/realtime/server";

export async function GET()
{
	const session = await requireAnySession();
	if (!session.ok)
	{
		return session.response;
	}

	const rows = listNotifications(session.user.id);

	return Response.json({
		ok: true,
		unread: countUnreadNotifications(session.user.id),
		unread_messages: countUnreadMessages(session.user.id),
		channel: userChannel(session.user.id),
		notifications: rows.map((row) =>
			serializeNotification(row, row.actor_username),
		),
	});
}

export async function PATCH(request: Request)
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
	const result = validateRead(body.value);
	if (!result.ok)
	{
		return Response.json({ errors: result.errors }, { status: 400 });
	}

	return Response.json({
		ok: true,
		updated: markAllNotificationsRead(session.user.id),
	});
}
