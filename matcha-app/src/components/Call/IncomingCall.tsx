"use client";

import { PresenceAvatar } from "@/components/Presence/PresenceAvatar";
import { HangUpIcon, PhoneIcon } from "./CallIcons";
import { useCall } from "./CallProvider";

export function IncomingCall() {
	const call = useCall();

	if (call.phase !== "ringing" || !call.incoming) {
		return null;
	}

	const name = call.peer?.name ?? "Quelqu’un";

	return (
		<div
			role="dialog"
			aria-modal="true"
			aria-label={`Appel entrant de ${name}`}
			className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-6 backdrop-blur-sm"
		>
			<div className="w-full max-w-sm rounded-2xl border border-edge/40 bg-cream p-6 text-center shadow-xl">
				<div className="flex justify-center">
					<PresenceAvatar
						url={call.peer?.photo_url ?? null}
						name={name}
						online
					/>
				</div>

				<p className="mt-4 text-base font-medium text-ink">{name}</p>
				<p className="mt-1 text-sm text-muted">Appel audio entrant…</p>

				<div className="mt-6 flex items-center justify-center gap-6">
					<button
						type="button"
						onClick={call.decline}
						aria-label="Refuser l’appel"
						className="inline-flex size-14 cursor-pointer items-center justify-center rounded-full bg-red-600 text-white transition-colors duration-200 ease-out hover:bg-red-700"
					>
						<HangUpIcon className="size-6" />
					</button>

					<button
						type="button"
						onClick={call.accept}
						aria-label="Accepter l’appel"
						className="inline-flex size-14 cursor-pointer items-center justify-center rounded-full bg-matcha text-white transition-colors duration-200 ease-out hover:bg-matcha-dark"
					>
						<PhoneIcon className="size-6" />
					</button>
				</div>
			</div>
		</div>
	);
}
