"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Alert } from "@/components/Form/Alert";
import { ActionButton } from "@/components/Form/Button";
import { PrivateScreen } from "@/components/Layout/Screen";
import {
	fetchFeed,
	type Candidate,
	type FeedFilters,
	type FeedPayload,
} from "@/lib/discovery/client";
import { CandidateSlide } from "./CandidateSlide";
import { FilterBar } from "./FeedFilters";

interface State {
	items: Candidate[];
	session: string | null;
	next: number | null;
	total: number;
	error: string | null;
	loading: boolean;
}

const SESSION_KEY = "feed:session";
const POSITION_KEY = "feed:position";

const EMPTY: State = {
	items: [],
	session: null,
	next: 0,
	total: 0,
	error: null,
	loading: false,
};

export function FeedPage({
	firstName,
	initial,
}: {
	firstName: string;
	initial: FeedPayload | null;
}) {
	const [filters, setFilters] = useState<FeedFilters>({});
	const [state, setState] = useState<State>(initial === null
		? EMPTY
		: {
			items: initial.items,
			session: initial.session,
			next: initial.next,
			total: initial.total,
			error: null,
			loading: false,
		});
	const [position, setPosition] = useState(0);
	const deck = useRef<HTMLUListElement>(null);
	const inFlight = useRef(false);
	const restored = useRef(false);

	const load = useCallback(
		async (
			current: FeedFilters,
			session: string | null,
			after: number,
			reset = false,
		) => {
			if (inFlight.current)
			{
				return;
			}
			inFlight.current = true;
			setState((previous) => reset
				? { ...EMPTY, loading: true }
				: { ...previous, loading: true, error: null });

			const result = await fetchFeed(current, session, after);
			inFlight.current = false;

			if (!result.ok)
			{
				setState((previous) => ({
					...previous,
					loading: false,
					error: result.errors[0]?.message ?? null,
				}));
				return;
			}

			const payload = result.data;
			setState((previous) => ({
				items: reset || payload.reset
					? payload.items
					: [...previous.items, ...payload.items],
				session: payload.session,
				next: payload.next,
				total: payload.total,
				error: null,
				loading: false,
			}));
		},
		[],
	);

	function changeFilters(next: FeedFilters) {
		sessionStorage.removeItem(SESSION_KEY);
		sessionStorage.removeItem(POSITION_KEY);
		setFilters(next);
		setPosition(0);
		deck.current?.scrollTo({ top: 0 });
		void load(next, null, 0, true);
	}

	useEffect(() => {
		if (restored.current)
		{
			return;
		}
		restored.current = true;

		const saved = sessionStorage.getItem(SESSION_KEY);
		if (saved === null)
		{
			return;
		}
		const target = Number(sessionStorage.getItem(POSITION_KEY) ?? "0");

		void (async () => {
			const items: Candidate[] = [];
			let after = 0;
			let next: number | null = 0;
			let total = 0;

			while (next !== null && items.length <= target)
			{
				const result = await fetchFeed({}, saved, after);
				if (!result.ok || result.data.reset)
				{
					return;
				}
				items.push(...result.data.items);
				next = result.data.next;
				total = result.data.total;
				if (next === null)
				{
					break;
				}
				after = next;
			}

			setState({
				items,
				session: saved,
				next,
				total,
				error: null,
				loading: false,
			});
			const index = Math.min(target, items.length - 1);
			setPosition(index);
			requestAnimationFrame(() => {
				deck.current
					?.querySelector(`[data-index="${index}"]`)
					?.scrollIntoView({ block: "start", behavior: "auto" });
			});
		})();
	}, []);

	useEffect(() => {
		if (state.session !== null)
		{
			sessionStorage.setItem(SESSION_KEY, state.session);
		}
	}, [state.session]);

	useEffect(() => {
		sessionStorage.setItem(POSITION_KEY, String(position));
	}, [position]);

	useEffect(() => {
		const container = deck.current;
		if (container === null)
		{
			return;
		}

		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries)
				{
					if (!entry.isIntersecting)
					{
						continue;
					}
					const index = Number(entry.target.getAttribute("data-index"));
					setPosition(index);
					if (index >= state.items.length - 3 && state.next !== null)
					{
						void load(filters, state.session, state.next);
					}
				}
			},
			{ root: container, threshold: 0.6 },
		);

		for (const slide of container.querySelectorAll("[data-index]"))
		{
			observer.observe(slide);
		}
		return () => observer.disconnect();
	}, [filters, load, state.items.length, state.next, state.session]);

	const empty = !state.loading && state.items.length === 0 && state.error === null;

	return (
		<PrivateScreen
			width="full"
			fit
			title={`Des profils pour vous, ${firstName}`}
			intro="Classés par proximité, affinités puis note. Ajustez les filtres pour affiner."
			footer={null}
		>
			<FilterBar
				filters={filters}
				onChange={changeFilters}
				total={state.total}
				position={position}
			/>

			{state.error !== null ? <Alert>{state.error}</Alert> : null}

			{empty ? (
				<div className="rounded-2xl border border-dashed border-edge bg-white/40 px-6 py-12 text-center">
					<p className="text-sm font-medium">Aucun profil ne correspond</p>
					<p className="mx-auto mt-1 max-w-sm text-sm text-muted">
						Élargissez la distance ou la tranche d’âge pour voir plus de monde.
					</p>
					<div className="mx-auto mt-5 max-w-56">
						<ActionButton
							type="button"
							tone="secondary"
							onClick={() => changeFilters({})}
						>
							Réinitialiser les filtres
						</ActionButton>
					</div>
				</div>
			) : null}

			{state.items.length > 0 ? (
				<ul
					ref={deck}
					className="min-h-0 w-full flex-1 snap-y snap-mandatory overflow-y-auto overscroll-contain scroll-smooth"
				>
					{state.items.map((candidate, index) => (
						<li
							key={candidate.id}
							data-index={index}
							className="h-full snap-start pb-3"
						>
							<CandidateSlide candidate={candidate} />
						</li>
					))}

					<li className="flex h-16 items-center justify-center text-sm text-muted">
						{state.next === null
							? "Vous avez vu tous les profils correspondants."
							: "Chargement…"}
					</li>
				</ul>
			) : null}

		</PrivateScreen>
	);
}
