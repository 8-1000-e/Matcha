"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Alert } from "@/components/Form/Alert";
import { type Place, searchPlaces } from "@/lib/profile/client";

const MIN_LENGTH = 2;
const DEBOUNCE_MS = 200;
const LIST_MAX_PX = 240;

function label(place: Place) {
	return place.neighborhood ? `${place.city} · ${place.neighborhood}` : place.city;
}

function detail(place: Place) {
	return [place.region, place.country].filter(Boolean).join(", ");
}

type CityPickerProps = {
	defaultValue?: string;
	error?: string;
	title?: string;
	titleClassName?: string;
	onPick: (place: Place) => void;
};
export function CityPicker({
	defaultValue = "",
	error,
	title = "Votre ville",
	titleClassName = "text-sm font-medium",
	onPick,
}: CityPickerProps) {
	const id = useId();
	const [query, setQuery] = useState(defaultValue);
	const [open, setOpen] = useState(false);
	const [active, setActive] = useState(-1);
	const [typed, setTyped] = useState(false);
	const [chosen, setChosen] = useState(defaultValue);
	const [result, setResult] = useState<{
		query: string;
		places: Place[];
		failed: boolean;
	}>({
		query: "",
		places: [],
		failed: false,
	});

	const latest = useRef(0);
	const field = useRef<HTMLInputElement>(null);
	const [dropUp, setDropUp] = useState(false);

	const trimmed = query.trim();
	const settled = trimmed === chosen.trim();
	const matching = !settled && result.query === trimmed;
	const places = matching ? result.places : [];
	const failed = matching && result.failed;
	const searching
		= !settled && trimmed.length >= MIN_LENGTH && result.query !== trimmed;

	useEffect(() => {
		const asked = query.trim();
		if (asked.length < MIN_LENGTH || asked === chosen.trim()) {
			return;
		}

		const ticket = latest.current + 1;
		latest.current = ticket;

		const timer = setTimeout(async () => {
			const found = await searchPlaces(asked);
			if (latest.current === ticket) {
				setResult({
					query: asked,
					places: found.ok ? found.data.places : [],
					failed: !found.ok,
				});
				setActive(-1);
			}
		}, DEBOUNCE_MS);

		return () => clearTimeout(timer);
	}, [query, chosen]);
	function updateDirection() {
		const box = field.current?.getBoundingClientRect();
		if (!box) {
			return;
		}
		const below = window.innerHeight - box.bottom;
		setDropUp(below < LIST_MAX_PX && box.top > below);
	}

	function choose(place: Place) {
		setQuery(label(place));
		setChosen(label(place));
		setOpen(false);
		onPick(place);
	}

	function handleKey(event: React.KeyboardEvent<HTMLInputElement>) {
		if (event.key === "Escape") {
			setOpen(false);
			return;
		}
		if (places.length === 0) {
			return;
		}
		if (event.key === "ArrowDown" || event.key === "ArrowUp") {
			event.preventDefault();
			setOpen(true);
			const step = event.key === "ArrowDown" ? 1 : -1;
			setActive((current) => {
				const next = current + step;
				if (next < 0) {
					return places.length - 1;
				}
				return next >= places.length ? 0 : next;
			});
			return;
		}
		if (event.key === "Enter" && active >= 0) {
			event.preventDefault();
			choose(places[active]);
		}
	}

	const listId = `${id}-list`;
	const visible = open && places.length > 0;

	return (
		<div className="relative min-w-0">
			<label htmlFor={id} className={titleClassName}>
				{title}
			</label>

			<input
				id={id}
				ref={field}
				type="text"
				role="combobox"
				autoComplete="off"
				aria-expanded={visible}
				aria-controls={listId}
				aria-autocomplete="list"
				aria-activedescendant={
					visible && active >= 0 ? `${id}-option-${active}` : undefined
				}
				aria-invalid={error ? true : undefined}
				placeholder="Commencez à taper…"
				value={query}
				onChange={(event) => {
					setQuery(event.target.value);
					setTyped(true);
					setOpen(true);
					updateDirection();
				}}
				onFocus={() => {
					setOpen(true);
					updateDirection();
				}}
				onBlur={() => setOpen(false)}
				onKeyDown={handleKey}
				className="mt-2 block min-h-12 w-full min-w-0 rounded-xl border border-edge bg-white/70 px-4 py-3 text-base transition-colors duration-200 ease-out hover:border-matcha/60 focus-visible:border-matcha aria-invalid:border-red-700 aria-invalid:bg-red-50/60"
			/>

			{visible ? (
				<ul
					id={listId}
					role="listbox"
					style={{ maxHeight: LIST_MAX_PX }}
					className={`absolute z-10 w-full overflow-y-auto rounded-xl border border-edge bg-white py-1 shadow-[0_12px_32px_-12px_rgba(38,48,28,0.25)] ${
						dropUp ? "bottom-full mb-1.5" : "mt-1.5"
					}`}
				>
					{places.map((place, index) => (
						<li
							key={`${place.latitude},${place.longitude},${place.neighborhood ?? ""}`}
							id={`${id}-option-${index}`}
							role="option"
							aria-selected={index === active}
							onMouseDown={(event) => {
								event.preventDefault();
								choose(place);
							}}
							onMouseEnter={() => setActive(index)}
							className={`cursor-pointer px-4 py-2.5 text-sm ${
								index === active ? "bg-leaf/50" : ""
							}`}
						>
							<span className="block truncate font-medium">{label(place)}</span>
							<span className="block truncate text-xs text-muted">
								{detail(place)}
							</span>
						</li>
					))}
				</ul>
			) : null}

			{error ? <Alert className="mt-2">{error}</Alert> : null}

			{!error && typed && !settled && trimmed.length >= MIN_LENGTH && !searching
				&& places.length === 0 ? (
					<p className="mt-2 text-xs text-muted">
						{failed
							? "Recherche impossible, vérifiez votre connexion."
							: "Aucune ville ne correspond. Vérifiez l’orthographe."}
					</p>
				) : null}
		</div>
	);
}