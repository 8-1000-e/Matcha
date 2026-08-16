interface Context {
	params: Promise<{ matchId: string; eventId: string }>;
}

export async function PATCH(_request: Request, _context: Context)
{
	// 1. requireConversation(matchId).
	// 2. findEvent(eventId, matchId) : absent -> 404.
	// 3. Seul l'organisateur peut modifier -> sinon 403.
	// 4. Valider le corps (memes regles que la creation).
	// 5. updateEvent(...) en base.
	// 6. Si google_event_id existe : accessTokenFor + updateCalendarEvent.
	// 7. Renvoyer { ok: true, event }.
	throw new Error("event update not implemented");
}

export async function DELETE(_request: Request, _context: Context)
{
	// 1. requireConversation(matchId).
	// 2. findEvent(eventId, matchId) : absent -> 404.
	// 3. Seul l'organisateur peut annuler -> sinon 403.
	// 4. setEventStatus(eventId, "cancelled").
	// 5. Si google_event_id existe : accessTokenFor + cancelCalendarEvent.
	//    L'evenement reste en base avec le statut "cancelled" : on garde
	//    la trace, on ne supprime pas la ligne.
	// 6. Renvoyer { ok: true, cancelled: true }.
	throw new Error("event cancellation not implemented");
}
