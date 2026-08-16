import { serializeEvent } from "@/lib/calendar/events";
import {
	accessTokenFor,
	cancelCalendarEvent,
	inviteFrom,
	updateCalendarEvent,
} from "@/lib/calendar/google";
import { validateEvent } from "@/lib/calendar/validation";
import { requireConversation } from "@/lib/calls/guard";
import {
	findEvent,
	findOAuthAccountFor,
	setEventStatus,
	updateEvent,
} from "@/lib/db";
import { readJsonBody } from "@/lib/http/body";

interface Context {
	params: Promise<{ matchId: string; eventId: string }>;
}

function notFound(): Response
{
	return Response.json({ errors: ["event not found"] }, { status: 404 });
}

export async function PATCH(request: Request, context: Context)
{
	const { matchId, eventId } = await context.params;
	const guarded = await requireConversation(matchId);
	if (!guarded.ok)
	{
		return guarded.response;
	}

	const event = findEvent(eventId, matchId);
	if (event === undefined)
	{
		return notFound();
	}
	if (event.organiser_id !== guarded.user.id)
	{
		return Response.json({ errors: ["not the organiser"] }, { status: 403 });
	}
	if (event.status === "cancelled")
	{
		return Response.json({ errors: ["event is cancelled"] }, { status: 409 });
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

	const updated = updateEvent(eventId, result.value);
	if (updated === undefined)
	{
		return notFound();
	}

	if (updated.google_event_id !== null)
	{
		const guest = findOAuthAccountFor("google", updated.guest_id);
		const token = await accessTokenFor(updated.organiser_id);
		if (guest?.email != null && token !== null)
		{
			await updateCalendarEvent(
				token,
				updated.google_event_id,
				inviteFrom(updated, guest.email),
			);
		}
	}

	return Response.json({ ok: true, event: serializeEvent(updated) });
}

export async function DELETE(_request: Request, context: Context)
{
	const { matchId, eventId } = await context.params;
	const guarded = await requireConversation(matchId);
	if (!guarded.ok)
	{
		return guarded.response;
	}

	const event = findEvent(eventId, matchId);
	if (event === undefined)
	{
		return notFound();
	}
	if (event.organiser_id !== guarded.user.id)
	{
		return Response.json({ errors: ["not the organiser"] }, { status: 403 });
	}

	setEventStatus(eventId, "cancelled");

	if (event.google_event_id !== null)
	{
		const token = await accessTokenFor(event.organiser_id);
		if (token !== null)
		{
			await cancelCalendarEvent(token, event.google_event_id);
		}
	}

	return Response.json({ ok: true, cancelled: true });
}
