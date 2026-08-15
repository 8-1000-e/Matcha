"use client";

import { useEffect, useState } from "react";
import type { ApiResult } from "@/lib/http/client";
import type { Paged } from "@/lib/profile/views";
import { PeopleList, type Person } from "./PeopleList";

export interface Tab<Scope extends string> {
	key: Scope;
	label: string;
	empty: string;
}

interface State {
	people: Person[] | null;
	pages: number;
	total: number;
	error: string | null;
}

const EMPTY: State = { people: null, pages: 1, total: 0, error: null };

function Pager({
	page,
	pages,
	onChange,
}: {
	page: number;
	pages: number;
	onChange: (next: number) => void;
}) {
	if (pages <= 1) {
		return null;
	}

	const step = "cursor-pointer rounded-lg border border-edge/60 px-3 py-1.5"
		+ " text-sm transition-colors duration-200 ease-out hover:border-matcha/60"
		+ " disabled:cursor-default disabled:border-edge/30 disabled:text-muted/50";

	return (
		<nav className="mt-6 flex items-center justify-center gap-4">
			<button
				type="button"
				className={step}
				disabled={page <= 1}
				onClick={() => onChange(page - 1)}
			>
				Précédent
			</button>

			<span className="text-sm text-muted">
				Page {page} sur {pages}
			</span>

			<button
				type="button"
				className={step}
				disabled={page >= pages}
				onClick={() => onChange(page + 1)}
			>
				Suivant
			</button>
		</nav>
	);
}

export function ActivityTabs<Scope extends string>({
	tabs,
	load,
}: {
	tabs: readonly Tab<Scope>[];
	load: (
		scope: Scope,
		page: number,
	) => Promise<ApiResult<Paged & { people: Person[] }>>;
}) {
	const first = tabs[0];
	const [scope, setScope] = useState<Scope>(first.key);
	const [page, setPage] = useState(1);
	const [state, setState] = useState<State>(EMPTY);

	useEffect(() => {
		let live = true;
		void load(scope, page).then((result) => {
			if (!live) {
				return;
			}
			if (result.ok) {
				setState({
					people: result.data.people,
					pages: result.data.pages,
					total: result.data.total,
					error: null,
				});
				return;
			}
			setState({
				people: [],
				pages: 1,
				total: 0,
				error: result.errors[0]?.message ?? "Chargement impossible.",
			});
		});
		return () => {
			live = false;
		};
	}, [load, page, scope]);

	function select(next: Scope) {
		if (next === scope) {
			return;
		}
		setScope(next);
		setPage(1);
		setState(EMPTY);
	}

	function turn(next: number) {
		setPage(next);
		setState(EMPTY);
	}

	const current = tabs.find((tab) => tab.key === scope) ?? first;

	return (
		<>
			<nav className="flex justify-center gap-10 border-t border-edge/30">
				{tabs.map((tab) => (
					<button
						key={tab.key}
						type="button"
						onClick={() => select(tab.key)}
						aria-current={scope === tab.key}
						className={`-mt-px cursor-pointer border-t-2 px-2 pt-4 pb-1 text-xs font-medium tracking-[0.12em] uppercase transition-colors duration-200 ease-out ${
							scope === tab.key
								? "border-matcha text-ink"
								: "border-transparent text-muted hover:text-ink"
						}`}
					>
						{tab.label}
					</button>
				))}
			</nav>

			<div className="mt-4">
				{state.error !== null ? (
					<p className="py-16 text-center text-sm text-muted">{state.error}</p>
				) : (
					<>
						<PeopleList people={state.people} empty={current.empty} />
						<Pager page={page} pages={state.pages} onChange={turn} />
					</>
				)}
			</div>
		</>
	);
}
