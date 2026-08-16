import { after } from "next/server";
import { serializeEvent } from "@/lib/calendar/events";
import { accessTokenFor, createCalendarEvent, inviteFrom } from "@/lib/calendar/google";
import { validateEvent } from "@/lib/calendar/validation";
import { requireConversation } from "@/lib/calls/guard";
import {
	createEvent,
	findOAuthAccountFor,
	listEvents,
	sendEventMessage,
	setGoogleEventId,
} from "@/lib/db";
import { readJsonBody } from "@/lib/http/body";
import { serializeMessage } from "@/lib/messages/messages";
import { emitMessage } from "@/lib/notifications/emit";
import { chatChannel, publish } from "@/lib/realtime/server";

interface Context {
	params: Promise<{ matchId: string }>;
}

export async function GET(_request: Request, context: Context)
{
	const { matchId } = await context.params;
	const guarded = await requireConversation(matchId);
	if (!guarded.ok)
	{
		return guarded.response;
	}

	return Response.json({
		ok: true,
		events: listEvents(matchId).map(serializeEvent),
	});
}

export async function POST(request: Request, context: Context)
{
	const { matchId } = await context.params;
	const guarded = await requireConversation(matchId);
	if (!guarded.ok)
	{
		return guarded.response;
	}
	const body = await readJsonBody(request);
	if (!body.ok)
	{
		return body.response;
	}
	const result = validateEvent(body.value);
	if (!result.ok)
	{
		return Response.json({ errors: result.errors }, { status: 400 });
	}
	const guest = findOAuthAccountFor("google", guarded.partnerId);
	if (guest === undefined || guest.email === null)
	{
		return Response.json({ errors: ["guest_google_required"] }, { status: 409 });
	}

	const token = await accessTokenFor(guarded.user.id);
	if (token === null)
	{
		return Response.json({ errors: ["calendar_not_connected"] }, { status: 409 });
	}

	const event = createEvent({
		match_id: matchId,
		organiser_id: guarded.user.id,
		guest_id: guarded.partnerId,
		title: result.value.title,
		location: result.value.location,
		starts_at: result.value.starts_at,
		ends_at: result.value.ends_at,
	});

	const googleId = await createCalendarEvent(token, inviteFrom(event, guest.email));
	if (googleId !== null)
	{
		setGoogleEventId(event.id, googleId);
	}

	const message = serializeMessage(
		sendEventMessage(matchId, guarded.user.id, event.id),
	);

	after(() => {
		publish(chatChannel(matchId), "message", message);
	});
	emitMessage(guarded.partnerId, guarded.user.id, matchId);

	return Response.json(
		{ ok: true, event: serializeEvent({ ...event, google_event_id: googleId }) },
		{ status: 201 },
	);
}
