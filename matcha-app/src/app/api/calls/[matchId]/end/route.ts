import { after } from "next/server";
import { CALL_END } from "@/lib/calls/events";
import { callNotFound, requireConversation } from "@/lib/calls/guard";
import { closeCall, elapsedSeconds, findCall, isPeer } from "@/lib/calls/registry";
import { validateEnd } from "@/lib/calls/validation";
import { messages, recordCall, type CallStatus } from "@/lib/db";
import { readJsonBody } from "@/lib/http/body";
import { serializeMessage } from "@/lib/messages/messages";
import { emitMissedCall } from "@/lib/notifications/emit";
import { chatChannel, publish } from "@/lib/realtime/server";

interface Context {
	params: Promise<{ matchId: string }>;
}

export async function POST(request: Request, context: Context)
{
	const { matchId } = await context.params;
	const guarded = await requireConversation(matchId);
	if (!guarded.ok)
	{
		return guarded.response;
	}

	const body = await readJsonBody(request);
	if (!body.ok)
	{
		return body.response;
	}

	const result = validateEnd(body.value);
	if (!result.ok)
	{
		return Response.json({ errors: result.errors }, { status: 400 });
	}

	const call = findCall(result.value.callId);
	if (call === undefined)
	{
		const settled = messages.findById(result.value.callId);
		if (settled === undefined || settled.match_id !== matchId
			|| settled.kind !== "call")
		{
			return callNotFound();
		}
		return Response.json({ ok: true, message: serializeMessage(settled) });
	}

	if (call.match_id !== matchId || !isPeer(call, guarded.user.id))
	{
		return callNotFound();
	}

	const status: CallStatus
		= call.answered_at !== null
			? "answered"
			: result.value.status === "missed"
				? "missed"
				: call.caller_id === guarded.user.id
					? "cancelled"
					: "declined";
	const duration = elapsedSeconds(call);
	closeCall(call.id);

	const payload = serializeMessage(
		recordCall(call.id, matchId, call.caller_id, status, duration),
	);

	if (status === "missed")
	{
		emitMissedCall(call.callee_id, call.caller_id, matchId);
	}

	after(() => {
		publish(chatChannel(matchId), CALL_END, {
			call_id: call.id,
			status,
		});
		publish(chatChannel(matchId), "message", payload);
	});

	return Response.json({ ok: true, message: payload });
}
