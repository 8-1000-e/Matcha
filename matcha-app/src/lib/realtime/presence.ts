"use client";

import { useEffect, useRef, useState } from "react";
import { presenceUserChannel } from "@/lib/realtime/channels";
import { watchPresence } from "@/lib/realtime/client";

interface Snapshot {
	id: string | null;
	online: boolean | null;
}

export function usePresence(
	userId: string | null,
	onDenied?: () => void,
): boolean | null {
	const [snapshot, setSnapshot] = useState<Snapshot>({
		id: null,
		online: null,
	});
	const denied = useRef(onDenied);

	useEffect(() => {
		denied.current = onDenied;
	});

	useEffect(() => {
		if (userId === null) {
			return;
		}
		return watchPresence(presenceUserChannel(userId), userId, {
			onPresence: (present) => {
				setSnapshot({ id: userId, online: present });
			},
			onDenied: () => {
				denied.current?.();
			},
		});
	}, [userId]);

	return snapshot.id === userId ? snapshot.online : null;
}
