import { callLabel } from "@/lib/calls/format";
import type { ChatMessage } from "@/lib/messages/client";
import { messageTime } from "@/lib/messages/dates";
import { CallArrow } from "./CallIcons";

export function CallEntry({
	message,
	mine,
}: {
	message: ChatMessage;
	mine: boolean;
}) {
	if (message.call_status === null) {
		return null;
	}

	const unanswered = message.call_status !== "answered";
	const tone
		= unanswered && !mine
			? "border-red-200 bg-red-50 text-red-700"
			: "border-edge/40 bg-white/60 text-muted";

	return (
		<li className="flex justify-center">
			<span
				className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs ${tone}`}
			>
				<CallArrow outgoing={mine} className="size-3.5" />
				{callLabel(message.call_status, message.call_duration_s, mine)}
				<span className="opacity-70">{messageTime(message.sent_at)}</span>
			</span>
		</li>
	);
}
