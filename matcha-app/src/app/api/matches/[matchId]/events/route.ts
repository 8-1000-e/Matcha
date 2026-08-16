interface Context {
	params: Promise<{ matchId: string }>;
}

export async function GET(_request: Request, _context: Context)
{
	// 1. requireConversation(matchId) : reprend les gardes du chat
	//    (session, match actif, pas de blocage). Voir lib/calls/guard.
	// 2. listEvents(matchId) et renvoyer { ok: true, events }.
	throw new Error("events list not implemented");
}

export async function POST(_request: Request, _context: Context)
{
	// 1. requireConversation(matchId).
	// 2. Lire et valider le corps : titre, lieu, starts_at, ends_at
	//    (validateEvent, a ecrire dans lib/calendar/validation.ts).
	// 3. Verifier que l'invite a bien relie Google :
	//    findOAuthAccountFor("google", partnerId) et son email.
	//    Sinon -> 409 { errors: ["guest_google_required"] }.
	// 4. accessTokenFor(viewer.id) : null -> 409
	//    { errors: ["calendar_not_connected"] }.
	// 5. createEvent(...) en base, puis createCalendarEvent(...).
	//    Si Google echoue, garder l'evenement local et laisser
	//    google_event_id a null : le rendez-vous existe dans l'app.
	// 6. setGoogleEventId(event.id, googleId).
	// 7. Publier un message dans la conversation pour que les deux
	//    le voient sans quitter le chat (voir emitMessage).
	// 8. Renvoyer 201 { ok: true, event }.
	throw new Error("event creation not implemented");
}
