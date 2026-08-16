import type { EventRow } from "@/lib/db";

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
	// 1. findOAuthAccountFor("google", userId) : pas de compte -> null.
	// 2. Pas de refresh_token stocke -> null (l'utilisateur doit relier
	//    son compte pour accorder l'acces au calendrier).
	// 3. Dechiffrer le refresh_token (meme mecanisme que les messages).
	// 4. POST TOKEN_URL en x-www-form-urlencoded :
	//    grant_type "refresh_token", refresh_token, client_id, client_secret.
	// 5. Reponse non ok -> null. Sinon renvoyer access_token.
	throw new Error(`accessTokenFor not implemented for ${userId}`);
}

export async function createCalendarEvent(_accessToken: string, _invite: CalendarInvite): Promise<string | null>
{
	// 1. POST EVENTS_URL?sendUpdates=all avec l'en-tete
	//    authorization: `Bearer ${accessToken}` et un corps JSON :
	//    { summary, location, start: { dateTime }, end: { dateTime },
	//      attendees: [{ email: invite.guestEmail }] }
	// 2. Reponse non ok -> null.
	// 3. Renvoyer l'id de l'evenement cree (champ "id").
	throw new Error("createCalendarEvent not implemented");
}

export async function updateCalendarEvent(_accessToken: string, googleEventId: string, _invite: CalendarInvite): Promise<boolean>
{
	// 1. PATCH `${EVENTS_URL}/${googleEventId}?sendUpdates=all`, meme corps
	//    que la creation (seuls les champs envoyes sont modifies).
	// 2. Renvoyer response.ok.
	throw new Error(`updateCalendarEvent not implemented for ${googleEventId}`);
}

export async function cancelCalendarEvent(_accessToken: string, googleEventId: string): Promise<boolean>
{
	// 1. DELETE `${EVENTS_URL}/${googleEventId}?sendUpdates=all`.
	// 2. Google renvoie 410 si l'evenement etait deja supprime :
	//    le traiter comme un succes.
	throw new Error(`cancelCalendarEvent not implemented for ${googleEventId}`);
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
