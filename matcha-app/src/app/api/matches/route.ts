import { requireSession } from "@/lib/auth/guards";
import {
	findUserSummary,
	isBlockedEitherWay,
	listMatches,
	listUnreadByMatch,
	type MatchListRow,
} from "@/lib/db";
import { serializeUserSummary } from "@/lib/profile/summary";

function lastMessage(match: MatchListRow, viewerId: string)
{
	if (match.last_sent_at === null || match.last_body === null)
	{
		return null;
	}
	return {
		body: match.last_body,
		sent_at: match.last_sent_at,
		mine: match.last_sender_id === viewerId,
	};
}

export async function GET()
{
	const session = await requireSession();
	if (!session.ok)
	{
		return session.response;
	}

	const unread = new Map(
		listUnreadByMatch(session.user.id).map((row) => [
			row.match_id,
			row.unread_count,
		]),
	);

	const matches = listMatches(session.user.id)
		.filter((match) => !isBlockedEitherWay(session.user.id, match.partner_id))
		.map((match) => {
			const partner = findUserSummary(match.partner_id);
			return {
				match_id: match.id,
				connected_at: match.connected_at,
				unread: unread.get(match.id) ?? 0,
				partner: partner === undefined ? null : serializeUserSummary(partner),
				last_message: lastMessage(match, session.user.id),
			};
		});

	return Response.json({ ok: true, matches });
}
