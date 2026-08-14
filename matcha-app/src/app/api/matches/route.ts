import { requireSession } from "@/lib/auth/guards";
import {
	findUserSummary,
	isBlockedEitherWay,
	listMatches,
	listUnreadByMatch,
} from "@/lib/db";
import { serializeUserSummary } from "@/lib/profile/summary";

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
			};
		});

	return Response.json({ ok: true, matches });
}
