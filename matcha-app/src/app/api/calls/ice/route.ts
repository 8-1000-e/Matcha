import { requireSession } from "@/lib/auth/guards";
import { iceServers } from "@/lib/calls/ice";
import { RING_TIMEOUT_MS } from "@/lib/calls/registry";
import { userChannel } from "@/lib/realtime/server";

export async function GET()
{
	const session = await requireSession();
	if (!session.ok)
	{
		return session.response;
	}

	return Response.json({
		ok: true,
		user_id: session.user.id,
		channel: userChannel(session.user.id),
		ice_servers: iceServers(),
		ring_timeout_ms: RING_TIMEOUT_MS,
	});
}
