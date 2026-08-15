"use client";

import { useCallback } from "react";
import { Footer } from "@/components/Layout/Footer";
import { PrivateScreen } from "@/components/Layout/Screen";
import { fetchLikers } from "@/lib/profile/views";
import { ActivityTabs, type Tab } from "./ActivityTabs";

type Scope = "received" | "sent";

const TABS: readonly Tab<Scope>[] = [
	{
		key: "received",
		label: "Qui m’a liké",
		empty: "Personne ne vous a encore liké.",
	},
	{
		key: "sent",
		label: "Mes likes",
		empty: "Vous n’avez encore liké personne.",
	},
];

export function LikesPage() {
	const load = useCallback(async (scope: Scope, page: number) => {
		const result = await fetchLikers(scope, page);
		if (!result.ok) {
			return result;
		}
		return {
			ok: true as const,
			data: {
				...result.data,
				people: result.data.likers.map((liker) => ({
					...liker,
					at: liker.liked_at,
				})),
			},
		};
	}, []);

	return (
		<PrivateScreen
			width="wide"
			title="Likes"
			intro="Les profils que vous avez likés et ceux qui vous ont liké."
			footer={<Footer />}
		>
			<ActivityTabs tabs={TABS} load={load} />
		</PrivateScreen>
	);
}
