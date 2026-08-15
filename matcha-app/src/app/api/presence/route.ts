import { requireSession } from "@/lib/auth/guards";
import { PRESENCE_WINDOW_SECONDS, touchLastSeen } from "@/lib/db";
import { presenceUserChannel } from "@/lib/realtime/server";

export async function POST()
{
	const session = await requireSession();
	if (!session.ok)
	{
		return session.response;
	}

	touchLastSeen(session.user.id);

	return Response.json({
		ok: true,
		window_seconds: PRESENCE_WINDOW_SECONDS,
		channel: presenceUserChannel(session.user.id),
	});
}
