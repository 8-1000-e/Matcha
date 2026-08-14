import { after } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import {
	findActiveMatchForUsers,
	isBlockedEitherWay,
	listConversation,
	markConversationRead,
	sendMessage,
	type MatchRow,
	type UserRow,
} from "@/lib/db";
import { readJsonBody } from "@/lib/http/body";
import { serializeMessage } from "@/lib/messages/messages";
import {
	validateConversationLimit,
	validateMessageBody,
} from "@/lib/messages/validation";
import { emitMessage } from "@/lib/notifications/emit";
import { validateRead } from "@/lib/notifications/validation";
import { chatChannel, publish } from "@/lib/realtime/server";

interface Context {
	params: Promise<{ matchId: string }>;
}

type Conversation =
	| { ok: true; user: UserRow; match: MatchRow; partnerId: string }
	| { ok: false; response: Response };

function notFound(): Response
{
	return Response.json({ errors: ["conversation not found"] }, { status: 404 });
}

async function conversation(matchId: string): Promise<Conversation>
{
	const session = await requireSession();
	if (!session.ok)
	{
		return { ok: false, response: session.response };
	}

	const match = findActiveMatchForUsers(matchId, session.user.id);
	if (match === undefined)
	{
		return { ok: false, response: notFound() };
	}

	const partnerId
		= match.user_a_id === session.user.id ? match.user_b_id : match.user_a_id;
	if (isBlockedEitherWay(session.user.id, partnerId))
	{
		return { ok: false, response: notFound() };
	}

	return { ok: true, user: session.user, match, partnerId };
}

export async function GET(request: Request, context: Context)
{
	const { matchId } = await context.params;
	const guarded = await conversation(matchId);
	if (!guarded.ok)
	{
		return guarded.response;
	}

	const parameters = new URL(request.url).searchParams;
	const limit = validateConversationLimit(parameters.get("limit"));
	if (!limit.ok)
	{
		return Response.json({ errors: limit.errors }, { status: 400 });
	}

	const before = parameters.get("before");
	const rows = listConversation(matchId, {
		before: before ?? undefined,
		limit: limit.value,
	});

	return Response.json({ ok: true, messages: rows.map(serializeMessage) });
}

export async function POST(request: Request, context: Context)
{
	const { matchId } = await context.params;
	const guarded = await conversation(matchId);
	if (!guarded.ok)
	{
		return guarded.response;
	}

	const body = await readJsonBody(request);
	if (!body.ok)
	{
		return body.response;
	}

	const result = validateMessageBody(body.value);
	if (!result.ok)
	{
		return Response.json({ errors: result.errors }, { status: 400 });
	}

	const payload = serializeMessage(
		sendMessage(matchId, guarded.user.id, result.value),
	);

	after(() => {
		publish(chatChannel(matchId), "message", payload);
	});
	emitMessage(guarded.partnerId, guarded.user.id, matchId);

	return Response.json({ ok: true, message: payload }, { status: 201 });
}

export async function PATCH(request: Request, context: Context)
{
	const { matchId } = await context.params;
	const guarded = await conversation(matchId);
	if (!guarded.ok)
	{
		return guarded.response;
	}

	const body = await readJsonBody(request);
	if (!body.ok)
	{
		return body.response;
	}

	const result = validateRead(body.value);
	if (!result.ok)
	{
		return Response.json({ errors: result.errors }, { status: 400 });
	}

	const updated = markConversationRead(matchId, guarded.user.id);
	const readAt = new Date().toISOString();
	const reader = guarded.user.id;

	after(() => {
		publish(chatChannel(matchId), "read", {
			match_id: matchId,
			reader_id: reader,
			read_at: readAt,
		});
	});

	return Response.json({ ok: true, updated });
}
