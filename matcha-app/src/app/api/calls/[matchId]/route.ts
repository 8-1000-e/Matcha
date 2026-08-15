import { after } from "next/server";
import { CALL_RING } from "@/lib/calls/events";
import { requireConversation } from "@/lib/calls/guard";
import {
	findBusyCall,
	openCall,
	RING_TIMEOUT_MS,
} from "@/lib/calls/registry";
import { findUserSummary } from "@/lib/db";
import { serializeUserSummary } from "@/lib/profile/summary";
import { publish, userChannel } from "@/lib/realtime/server";

interface Context {
	params: Promise<{ matchId: string }>;
}

export async function POST(_request: Request, context: Context)
{
	const { matchId } = await context.params;
	const guarded = await requireConversation(matchId);
	if (!guarded.ok)
	{
		return guarded.response;
	}

	if (findBusyCall(guarded.user.id) !== undefined)
	{
		return Response.json({ errors: ["already_in_call"] }, { status: 409 });
	}
	if (findBusyCall(guarded.partnerId) !== undefined)
	{
		return Response.json({ errors: ["partner_busy"] }, { status: 409 });
	}

	const call = openCall(matchId, guarded.user.id, guarded.partnerId);
	const caller = findUserSummary(guarded.user.id);

	after(() => {
		publish(userChannel(guarded.partnerId), CALL_RING, {
			call_id: call.id,
			match_id: matchId,
			caller: caller === undefined ? null : serializeUserSummary(caller),
		});
	});

	return Response.json(
		{ ok: true, call_id: call.id, ring_timeout_ms: RING_TIMEOUT_MS },
		{ status: 201 },
	);
}
