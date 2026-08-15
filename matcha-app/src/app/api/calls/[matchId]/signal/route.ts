import { after } from "next/server";
import { CALL_SIGNAL } from "@/lib/calls/events";
import { callNotFound, requireConversation } from "@/lib/calls/guard";
import { answerCall, findCall, isPeer } from "@/lib/calls/registry";
import { validateSignal } from "@/lib/calls/validation";
import { readJsonBody } from "@/lib/http/body";
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

	const result = validateSignal(body.value);
	if (!result.ok)
	{
		return Response.json({ errors: result.errors }, { status: 400 });
	}

	const call = findCall(result.value.callId);
	if (
		call === undefined
		|| call.match_id !== matchId
		|| !isPeer(call, guarded.user.id)
	)
	{
		return callNotFound();
	}

	if (result.value.kind === "answer")
	{
		answerCall(call.id);
	}

	after(() => {
		publish(chatChannel(matchId), CALL_SIGNAL, {
			call_id: call.id,
			kind: result.value.kind,
			payload: result.value.payload,
			sender_id: guarded.user.id,
		});
	});

	return Response.json({ ok: true });
}
