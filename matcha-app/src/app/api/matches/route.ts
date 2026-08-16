import { requireSession } from "@/lib/auth/guards";
import {
	countUnreadMessages,
	findUserSummary,
	listMatches,
	listUnreadByMatch,
	type MatchListRow,
} from "@/lib/db";
import { readBody } from "@/lib/messages/messages";
import { validateMatchList } from "@/lib/messages/validation";
import { serializeUserSummary } from "@/lib/profile/summary";

function lastMessage(match: MatchListRow, viewerId: string)
{
	if (match.last_sent_at === null || match.last_kind === null)
	{
		return null;
	}
	return {
		kind: match.last_kind,
		body: readBody(match.last_kind, match.last_body),
		call_status: match.last_call_status,
		call_duration_s: match.last_call_duration_s,
		sent_at: match.last_sent_at,
		mine: match.last_sender_id === viewerId,
	};
}

export async function GET(request: Request)
{
	const session = await requireSession();
	if (!session.ok)
	{
		return session.response;
	}

	const options = validateMatchList(new URL(request.url).searchParams);
	if (!options.ok)
	{
		return Response.json({ errors: options.errors }, { status: 400 });
	}

	const unread = new Map(
		listUnreadByMatch(session.user.id).map((row) => [
			row.match_id,
			row.unread_count,
		]),
	);

	const rows = listMatches(session.user.id, options.value);
	const last = rows[rows.length - 1];

	return Response.json({
		ok: true,
		unread_messages: countUnreadMessages(session.user.id),
		cursor:
			last === undefined
				? null
				: { activity_at: last.activity_at, id: last.id },
		matches: rows.map((match) => {
			const partner = findUserSummary(match.partner_id);
			return {
				match_id: match.id,
				connected_at: match.connected_at,
				activity_at: match.activity_at,
				unread: unread.get(match.id) ?? 0,
				partner: partner === undefined ? null : serializeUserSummary(partner),
				last_message: lastMessage(match, session.user.id),
			};
		}),
	});
}
