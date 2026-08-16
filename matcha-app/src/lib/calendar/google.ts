import { decryptMessage } from "@/lib/crypto/messages";
import { findOAuthAccountFor, type EventRow } from "@/lib/db";

export const CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.events";

export const TOKEN_URL = "https://oauth2.googleapis.com/token";

export const EVENTS_URL =
	"https://www.googleapis.com/calendar/v3/calendars/primary/events";

export interface CalendarInvite {
	title: string;
	location: string | null;
	startsAt: string;
	endsAt: string;
	guestEmail: string;
}

export async function accessTokenFor(userId: string): Promise<string | null>
{
	const clientId = process.env.OAUTH_GOOGLE_CLIENT_ID;
	const clientSecret = process.env.OAUTH_GOOGLE_CLIENT_SECRET;

	if (!clientId || !clientSecret)
	{
		return null;
	}
	const account = findOAuthAccountFor("google", userId);
	if (account === undefined || account.refresh_token === null)
	{
		return null;
	}

	const form = new URLSearchParams();
	form.set("grant_type", "refresh_token");
	form.set("refresh_token", decryptMessage(account.refresh_token));
	form.set("client_id", clientId);
	form.set("client_secret", clientSecret);

	const response = await fetch(TOKEN_URL, {
		method: "POST",
		headers: {
			"content-type": "application/x-www-form-urlencoded",
			accept: "application/json",
		},
		body: form,
	});
	if (!response.ok)
	{
		return null;
	}

	const parsed = (await response.json()) as { access_token?: unknown };

	return typeof parsed.access_token === "string" ? parsed.access_token : null;
}

function headers(accessToken: string): HeadersInit
{
	return {
		authorization: `Bearer ${accessToken}`,
		"content-type": "application/json",
		accept: "application/json",
	};
}

function payload(invite: CalendarInvite): string
{
	return JSON.stringify({
		summary: invite.title,
		location: invite.location,
		start: { dateTime: invite.startsAt },
		end: { dateTime: invite.endsAt },
		attendees: [{ email: invite.guestEmail }],
	});
}

export async function createCalendarEvent(accessToken: string, invite: CalendarInvite): Promise<string | null>
{
	const response = await fetch(`${EVENTS_URL}?sendUpdates=all`, {
		method: "POST",
		headers: headers(accessToken),
		body: payload(invite),
	});
	if (!response.ok)
	{
		return null;
	}

	const parsed = (await response.json()) as { id?: unknown };

	return typeof parsed.id === "string" ? parsed.id : null;
}

export async function updateCalendarEvent(accessToken: string, googleEventId: string, invite: CalendarInvite): Promise<boolean>
{
	const response = await fetch(
		`${EVENTS_URL}/${encodeURIComponent(googleEventId)}?sendUpdates=all`,
		{
			method: "PATCH",
			headers: headers(accessToken),
			body: payload(invite),
		},
	);

	return response.ok;
}

export async function cancelCalendarEvent(accessToken: string, googleEventId: string): Promise<boolean>
{
	const response = await fetch(
		`${EVENTS_URL}/${encodeURIComponent(googleEventId)}?sendUpdates=all`,
		{
			method: "DELETE",
			headers: { authorization: `Bearer ${accessToken}` },
		},
	);

	return response.ok || response.status === 410;
}

export function inviteFrom(event: EventRow, guestEmail: string): CalendarInvite
{
	return {
		title: event.title,
		location: event.location,
		startsAt: event.starts_at,
		endsAt: event.ends_at,
		guestEmail,
	};
}
