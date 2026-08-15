"use client";

import { useEffect, useState } from "react";
import { PrivateScreen } from "@/components/Layout/Screen";
import { fetchViews, type ProfileView } from "@/lib/profile/views";
import { PeopleList, type Person } from "./PeopleList";

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
	const [scope, setScope] = useState<"received" | "made">("received");
	const [people, setPeople] = useState<Person[] | null>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let live = true;
		void fetchViews(scope).then((result) => {
			if (!live) {
				return;
			}
			if (result.ok) {
				setPeople(toPeople(result.data.views));
				setError(null);
				return;
			}
			setPeople([]);
			setError(result.errors[0]?.message ?? "Chargement impossible.");
		});
		return () => {
			live = false;
		};
	}, [scope]);

	const tabs = [
		{ key: "received" as const, label: "Qui m’a vu" },
		{ key: "made" as const, label: "Mes visites" },
	];

	return (
		<PrivateScreen
			width="wide"
			title="Visites"
			intro="Les profils que vous avez consultés et ceux qui ont consulté le vôtre."
			footer={null}
		>
			<nav className="flex justify-center gap-10 border-t border-edge/30">
				{tabs.map((entry) => (
					<button
						key={entry.key}
						type="button"
						onClick={() => {
							setScope(entry.key);
							setPeople(null);
						}}
						aria-current={scope === entry.key}
						className={`-mt-px cursor-pointer border-t-2 px-2 pt-4 pb-1 text-xs font-medium tracking-[0.12em] uppercase transition-colors duration-200 ease-out ${
							scope === entry.key
								? "border-matcha text-ink"
								: "border-transparent text-muted hover:text-ink"
						}`}
					>
						{entry.label}
					</button>
				))}
			</nav>

			<div className="mt-4">
				{error !== null ? (
					<p className="py-16 text-center text-sm text-muted">{error}</p>
				) : (
					<PeopleList
						people={people}
						empty={
							scope === "received"
								? "Personne n’a encore consulté votre profil."
								: "Vous n’avez encore consulté aucun profil."
						}
					/>
				)}
			</div>
		</PrivateScreen>
	);
}
