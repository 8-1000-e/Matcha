import { CalendarIcon } from "@/components/Event/EventIcons";
import type { AppEvent } from "@/lib/calendar/client";
import { messageTime } from "@/lib/messages/dates";

const WHEN = new Intl.DateTimeFormat("fr-FR", {
	weekday: "long",
	day: "numeric",
	month: "long",
});

const SLOT = new Intl.DateTimeFormat("fr-FR", {
	hour: "2-digit",
	minute: "2-digit",
});

export function EventEntry({
	event,
	mine,
	sentAt,
	onOpen,
}: {
	event: AppEvent | undefined;
	mine: boolean;
	sentAt: string;
	onOpen: () => void;
}) {
	const cancelled = event?.status === "cancelled";

	return (
		<li className={`flex min-w-0 ${mine ? "justify-end" : "justify-start"}`}>
			<button
				type="button"
				onClick={onOpen}
				className={`max-w-[80%] min-w-0 cursor-pointer rounded-2xl border border-l-4 px-3.5 py-2.5 text-left transition-colors duration-200 ease-out ${
					cancelled
						? "border-edge/40 border-l-edge bg-white/50"
						: "border-edge/40 border-l-matcha bg-white/80 hover:bg-leaf/30"
				}`}
			>
				<span className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-matcha-dark uppercase">
					<CalendarIcon className="size-3.5" />
					{cancelled ? "Rendez-vous annulé" : "Rendez-vous"}
				</span>

				{event === undefined ? (
					<span className="mt-1.5 block text-sm text-muted">
						Ouvrir pour voir le détail.
					</span>
				) : (
					<>
						<span
							className={`mt-1.5 block text-sm font-medium ${
								cancelled ? "text-muted line-through" : "text-ink"
							}`}
						>
							{event.title}
						</span>

						<span className="mt-0.5 block text-sm text-ink/80 first-letter:uppercase">
							{WHEN.format(new Date(event.starts_at))}
							{" · "}
							{SLOT.format(new Date(event.starts_at))}
							{" – "}
							{SLOT.format(new Date(event.ends_at))}
						</span>

						{event.location === null ? null : (
							<span className="block text-sm text-muted">{event.location}</span>
						)}
					</>
				)}

				<span className="mt-1.5 block text-right text-xs text-muted">
					{messageTime(sentAt)}
				</span>
			</button>
		</li>
	);
}
