import { after } from "next/server";
import { chatChannel, publish } from "./server";

export function closeConversation(matchId: string | null): void
{
	if (matchId === null)
	{
		return;
	}
	after(() => {
		publish(chatChannel(matchId), "closed", { match_id: matchId });
	});
}
