"use client";

import { useEffect, useState } from "react";
import { PrivateScreen } from "@/components/Layout/Screen";
import { fetchLikers } from "@/lib/profile/views";
import { PeopleList, type Person } from "./PeopleList";

export function LikesPage() {
	const [scope, setScope] = useState<"received" | "sent">("received");
	const [people, setPeople] = useState<Person[] | null>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let live = true;
		void fetchLikers(scope).then((result) => {
			if (!live) {
				return;
			}
			if (result.ok) {
				setPeople(
					result.data.likers.map((liker) => ({ ...liker, at: liker.liked_at })),
				);
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
		{ key: "received" as const, label: "Qui m’a liké" },
		{ key: "sent" as const, label: "Mes likes" },
	];

	return (
		<PrivateScreen
			width="wide"
			title="Likes"
			intro="Les profils que vous avez likés et ceux qui vous ont liké."
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
								? "Personne ne vous a encore liké."
								: "Vous n’avez encore liké personne."
						}
					/>
				)}
			</div>
		</PrivateScreen>
	);
}
