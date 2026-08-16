import { requireSession } from "@/lib/auth/guards";
import {
	findActiveMatchForUsers,
	isBlockedEitherWay,
	users,
	type MatchRow,
	type UserRow,
} from "@/lib/db";

export type CallGuard =
	| { ok: true; user: UserRow; match: MatchRow; partnerId: string }
	| { ok: false; response: Response };

export function callNotFound(): Response {
	return Response.json({ errors: ["conversation not found"] }, { status: 404 });
}

export async function requireConversation(matchId: string): Promise<CallGuard> {
	const session = await requireSession();
	if (!session.ok) {
		return { ok: false, response: session.response };
	}

	const match = findActiveMatchForUsers(matchId, session.user.id);
	if (match === undefined) {
		return { ok: false, response: callNotFound() };
	}

	const partnerId
		= match.user_a_id === session.user.id ? match.user_b_id : match.user_a_id;
	if (isBlockedEitherWay(session.user.id, partnerId)) {
		return { ok: false, response: callNotFound() };
	}

	const partner = users.findById(partnerId);
	if (partner === undefined || partner.deleted_at !== null) {
		return { ok: false, response: callNotFound() };
	}

	return { ok: true, user: session.user, match, partnerId };
}
