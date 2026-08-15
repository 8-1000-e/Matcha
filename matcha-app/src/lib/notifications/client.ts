"use client";

import { useCallback, useEffect, useState } from "react";
import { request, send } from "@/lib/http/client";
import { subscribe } from "@/lib/realtime/client";
import { isConversationOpen } from "./active";
import type { NotificationPayload } from "./notifications";

interface Feed {
	unread: number;
	unread_messages: number;
	channel: string;
	notifications: NotificationPayload[];
}

export interface NotificationFeed {
	notifications: NotificationPayload[];
	unread: number;
	unreadMessages: number;
	markAll: () => void;
	markOne: (id: string) => void;
}

export function useNotifications(): NotificationFeed {
	const [notifications, setNotifications] = useState<NotificationPayload[]>([]);
	const [unread, setUnread] = useState(0);
	const [unreadMessages, setUnreadMessages] = useState(0);
	const [channel, setChannel] = useState<string | null>(null);

	const load = useCallback(() => {
		void request<Feed>("/api/notifications", { method: "GET" }).then(
			(result) => {
				if (!result.ok) {
					return;
				}
				setNotifications(result.data.notifications);
				setUnread(result.data.unread);
				setUnreadMessages(result.data.unread_messages);
				setChannel(result.data.channel);
			},
		);
	}, []);

	useEffect(() => {
		load();
	}, [load]);

	useEffect(() => {
		if (channel === null) {
			return;
		}
		return subscribe(channel, "notification", (payload) => {
			const incoming = payload as NotificationPayload;
			if (incoming.type === "MESSAGE" && isConversationOpen(incoming.link)) {
				return;
			}
			setNotifications((current) =>
				current.some((entry) => entry.id === incoming.id)
					? current
					: [incoming, ...current],
			);
			setUnread((current) => current + 1);
			if (incoming.type === "MESSAGE") {
				setUnreadMessages((current) => current + 1);
			}
		});
	}, [channel]);

	useEffect(() => {
		if (channel === null) {
			return;
		}
		return subscribe(channel, "notifications-read", load);
	}, [channel, load]);

	const markAll = useCallback(() => {
		setNotifications((current) =>
			current.map((entry) => ({ ...entry, read: true })),
		);
		setUnread(0);
		void send("PATCH", "/api/notifications", { read: true }).then((result) => {
			if (!result.ok) {
				void request<Feed>("/api/notifications", { method: "GET" }).then(
					(refreshed) => {
						if (refreshed.ok) {
							setNotifications(refreshed.data.notifications);
							setUnread(refreshed.data.unread);
						}
					},
				);
			}
		});
	}, []);

	const markOne = useCallback((id: string) => {
		setNotifications((current) =>
			current.map((entry) =>
				entry.id === id ? { ...entry, read: true } : entry,
			),
		);
		setUnread((current) => Math.max(0, current - 1));
		void send("PATCH", `/api/notifications/${id}`, { read: true }).then(
			(result) => {
				if (!result.ok) {
					void request<Feed>("/api/notifications", { method: "GET" }).then(
						(refreshed) => {
							if (refreshed.ok) {
								setNotifications(refreshed.data.notifications);
								setUnread(refreshed.data.unread);
							}
						},
					);
				}
			},
		);
	}, []);

	return { notifications, unread, unreadMessages, markAll, markOne };
}
