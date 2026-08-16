"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Alert } from "@/components/Form/Alert";
import { ActionButton } from "@/components/Form/Button";
import { Footer } from "@/components/Layout/Footer";
import { PrivateScreen } from "@/components/Layout/Screen";
import {
	fetchFeed,
	type Candidate,
	type FeedFilters,
	type FeedPayload,
	type TagOption,
} from "@/lib/discovery/client";
import { likeUser, unlikeUser } from "@/lib/profile/publicClient";
import { CandidateSlide } from "./CandidateSlide";
import { Deck } from "./Deck";
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
const PREFETCH = 3;

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
	tags,
}: {
	firstName: string;
	initial: FeedPayload | null;
	tags: readonly TagOption[];
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
	const [liked, setLiked] = useState<Record<string, boolean>>({});
	const [likePending, setLikePending] = useState(false);
	const [likeError, setLikeError] = useState<string | null>(null);
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

	const go = useCallback(
		(offset: number) => {
			const last = Math.max(0, state.items.length - 1);
			const target = Math.min(Math.max(0, position + offset), last);

			if (target >= state.items.length - PREFETCH && state.next !== null)
			{
				void load(filters, state.session, state.next);
			}
			setPosition(target);
			setLikeError(null);
		},
		[filters, load, position, state.items.length, state.next, state.session],
	);

	const toggleLike = useCallback(
		async (candidate: Candidate, force?: boolean) => {
			const current = liked[candidate.id] ?? candidate.viewer_liked;
			const next = force ?? !current;
			if (next === current)
			{
				return;
			}

			setLiked((previous) => ({ ...previous, [candidate.id]: next }));
			setLikeError(null);
			setLikePending(true);

			const result = next
				? await likeUser(candidate.id)
				: await unlikeUser(candidate.id);
			setLikePending(false);

			if (!result.ok)
			{
				setLiked((previous) => ({ ...previous, [candidate.id]: current }));
				setLikeError(result.errors[0]?.message ?? null);
			}
		},
		[liked],
	);

	function changeFilters(next: FeedFilters) {
		sessionStorage.removeItem(SESSION_KEY);
		sessionStorage.removeItem(POSITION_KEY);
		setFilters(next);
		setPosition(0);
		setLiked({});
		setLikeError(null);
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
			setPosition(Math.max(0, Math.min(target, items.length - 1)));
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
		function onKey(event: KeyboardEvent) {
			if (event.key !== "ArrowLeft" && event.key !== "ArrowRight")
			{
				return;
			}
			if (event.metaKey || event.ctrlKey || event.altKey)
			{
				return;
			}

			const target = event.target as Element | null;
			if (target?.closest("input, select, textarea, [contenteditable]") != null)
			{
				return;
			}

			go(event.key === "ArrowLeft" ? -1 : 1);
		}

		window.addEventListener("keydown", onKey);
		return () => {
			window.removeEventListener("keydown", onKey);
		};
	}, [go]);

	const empty = !state.loading && state.items.length === 0 && state.error === null;
	const current = state.items[position] ?? null;
	const ended
		= current !== null
		&& !state.loading
		&& state.next === null
		&& position >= state.items.length - 1;

	return (
		<PrivateScreen
			width="wide"
			fit
			footer={<Footer />}
		>
			<FilterBar
				firstName={firstName}
				filters={filters}
				onChange={changeFilters}
				tags={tags}
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

			{current !== null ? (
				<Deck
					canGoBack={position > 0}
					canGoForward={position < state.items.length - 1 || state.next !== null}
					liked={liked[current.id] ?? current.viewer_liked}
					onBack={() => go(-1)}
					onForward={() => go(1)}
					onLike={() => void toggleLike(current, true)}
				>
					<CandidateSlide
						key={current.id}
						candidate={current}
						liked={liked[current.id] ?? current.viewer_liked}
						pending={likePending}
						error={likeError}
						onLike={() => void toggleLike(current)}
					/>
				</Deck>
			) : null}

			{current === null && state.loading ? (
				<p className="py-16 text-center text-sm text-muted">Chargement…</p>
			) : null}

			{ended ? (
				<div className="mt-3 rounded-2xl border border-dashed border-edge bg-white/40 px-6 py-5 text-center">
					<p className="text-sm font-medium">
						Vous êtes au bout de la pile
					</p>
					<p className="mx-auto mt-1 max-w-md text-sm text-muted">
						{state.items.length === 1
							? "Un seul profil correspond à vos critères."
							: `Vous avez vu les ${state.items.length} profils qui correspondent à vos critères.`}{" "}
						Élargissez la distance ou la tranche d’âge pour en voir d’autres.
					</p>
					<div className="mx-auto mt-4 max-w-56">
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
		</PrivateScreen>
	);
}
