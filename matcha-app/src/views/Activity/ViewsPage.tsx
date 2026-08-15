"use client";

import { useCallback } from "react";
import { PrivateScreen } from "@/components/Layout/Screen";
import { fetchViews, type ProfileView } from "@/lib/profile/views";
import { ActivityTabs, type Tab } from "./ActivityTabs";
import type { Person } from "./PeopleList";

type Scope = "received" | "made";

const TABS: readonly Tab<Scope>[] = [
	{
		key: "received",
		label: "Qui m’a vu",
		empty: "Personne n’a encore consulté votre profil.",
	},
	{
		key: "made",
		label: "Mes visites",
		empty: "Vous n’avez encore consulté aucun profil.",
	},
];

function toPeople(views: ProfileView[]): Person[] {
	return views.map((view) => ({
		...view,
		at: view.viewed_at,
		detail:
			view.visit_count !== undefined && view.visit_count > 1
				? `${view.visit_count} visites`
				: undefined,
	}));
}

export function ViewsPage() {
	const load = useCallback(async (scope: Scope, page: number) => {
		const result = await fetchViews(scope, page);
		if (!result.ok) {
			return result;
		}
		return {
			ok: true as const,
			data: { ...result.data, people: toPeople(result.data.views) },
		};
	}, []);

	return (
		<PrivateScreen
			width="wide"
			title="Visites"
			intro="Les profils que vous avez consultés et ceux qui ont consulté le vôtre."
			footer={null}
		>
			<ActivityTabs tabs={TABS} load={load} />
		</PrivateScreen>
	);
}
