"use client";

import { useState } from "react";
import { ActionButton } from "@/components/Form/Button";
import type { FeedFilters } from "@/lib/discovery/client";

const SORTS: readonly { value: string; label: string }[] = [
	{ value: "", label: "Suggestions" },
	{ value: "distance", label: "Proximité" },
	{ value: "common_tags", label: "Centres d’intérêt en commun" },
	{ value: "popularity", label: "Note" },
	{ value: "age", label: "Âge" },
	{ value: "last_seen", label: "Dernière connexion" },
	{ value: "online", label: "En ligne" },
];

const ORDERS: Record<string, { asc: string; desc: string; natural: "asc" | "desc" }> = {
	distance: { asc: "Du plus proche", desc: "Du plus loin", natural: "asc" },
	common_tags: {
		asc: "Le moins d’affinités",
		desc: "Le plus d’affinités",
		natural: "desc",
	},
	popularity: {
		asc: "Les moins bien notés",
		desc: "Les mieux notés",
		natural: "desc",
	},
	age: { asc: "Du plus jeune", desc: "Du plus âgé", natural: "asc" },
	last_seen: {
		asc: "Vus il y a longtemps",
		desc: "Vus récemment",
		natural: "desc",
	},
	online: {
		asc: "Hors ligne d’abord",
		desc: "En ligne d’abord",
		natural: "desc",
	},
};

const DISTANCES: readonly { value: string; label: string }[] = [
	{ value: "", label: "Partout" },
	{ value: "10", label: "Moins de 10 km" },
	{ value: "50", label: "Moins de 50 km" },
	{ value: "200", label: "Moins de 200 km" },
];

const RATINGS: readonly { value: string; label: string }[] = [
	{ value: "", label: "Toutes les notes" },
	{ value: "3", label: "3 ★ et plus" },
	{ value: "4", label: "4 ★ et plus" },
	{ value: "5", label: "5 ★" },
];

const FIELD = "min-h-10 w-full rounded-lg border border-edge/60 bg-white px-3"
	+ " text-sm transition-colors duration-200 ease-out hover:border-matcha/60"
	+ " focus-visible:border-matcha";

function Field({
	label,
	value,
	options,
	onChange,
}: {
	label: string;
	value: string;
	options: readonly { value: string; label: string }[];
	onChange: (value: string) => void;
}) {
	return (
		<label className="flex flex-col gap-1.5">
			<span className="text-xs text-muted">{label}</span>
			<select
				value={value}
				onChange={(event) => onChange(event.target.value)}
				className={FIELD}
			>
				{options.map((option) => (
					<option key={option.value} value={option.value}>
						{option.label}
					</option>
				))}
			</select>
		</label>
	);
}

function count(filters: FeedFilters): number {
	return Object.values(filters).filter((value) => value !== undefined).length;
}

export function FilterBar({
	firstName,
	filters,
	onChange,
	total,
	position,
}: {
	firstName: string;
	filters: FeedFilters;
	onChange: (filters: FeedFilters) => void;
	total: number;
	position: number;
}) {
	const [open, setOpen] = useState(false);
	const [draft, setDraft] = useState<FeedFilters>(filters);
	const active = count(filters);

	const patch = (next: Partial<FeedFilters>) =>
		setDraft((previous) => ({ ...previous, ...next }));
	const number = (raw: string) => (raw === "" ? undefined : Number.parseInt(raw, 10));

	function toggle() {
		if (!open) {
			setDraft(filters);
		}
		setOpen(!open);
	}

	function apply() {
		setOpen(false);
		onChange(draft);
	}

	return (
		<div className="mb-3 flex flex-col gap-3">
			<div className="flex items-center justify-between gap-3">
				<h1 className="mr-2 truncate text-base font-semibold tracking-tight">
					Des profils pour vous, {firstName}
				</h1>
				<button
					type="button"
					onClick={toggle}
					aria-expanded={open}
					className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg bg-white px-4 text-sm font-medium ring-1 ring-edge/60 transition-colors duration-200 ease-out hover:ring-matcha/60"
				>
					<svg viewBox="0 0 16 16" className="size-4" fill="none" aria-hidden="true">
						<path
							d="M2 4h12M4.5 8h7M7 12h2"
							stroke="currentColor"
							strokeWidth="1.5"
							strokeLinecap="round"
						/>
					</svg>
					Filtres
					{active > 0 ? (
						<span className="text-xs text-matcha">({active})</span>
					) : null}
				</button>

				<p className="ml-auto text-sm text-muted tabular-nums" role="status">
					{total === 0 ? "Aucun profil" : `${Math.min(position + 1, total)} / ${total}`}
				</p>
			</div>

			{open ? (
				<div className="flex flex-col gap-4 rounded-xl bg-white/70 p-4 ring-1 ring-edge/40">
					<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
						<Field
							label="Trier par"
							value={draft.sort ?? ""}
							options={SORTS}
							onChange={(value) =>
								patch(
									value === ""
										? { sort: undefined, direction: undefined }
										: { sort: value, direction: ORDERS[value]?.natural ?? "asc" },
								)}
						/>
						<Field
							label="Ordre"
							value={draft.direction ?? "asc"}
							options={
								draft.sort === undefined
									? [{ value: "asc", label: "Ordre des suggestions" }]
									: [
										{
											value: ORDERS[draft.sort]?.natural ?? "asc",
											label:
												ORDERS[draft.sort]?.[ORDERS[draft.sort]?.natural ?? "asc"]
												?? "Croissant",
										},
										{
											value: ORDERS[draft.sort]?.natural === "asc" ? "desc" : "asc",
											label:
												ORDERS[draft.sort]?.natural === "asc"
													? (ORDERS[draft.sort]?.desc ?? "Décroissant")
													: (ORDERS[draft.sort]?.asc ?? "Croissant"),
										},
									]
							}
							onChange={(value) =>
								patch({ direction: value === "desc" ? "desc" : "asc" })}
						/>
						<Field
							label="Distance"
							value={draft.maxDistanceKm === undefined
								? ""
								: String(draft.maxDistanceKm)}
							options={DISTANCES}
							onChange={(value) => patch({ maxDistanceKm: number(value) })}
						/>
						<Field
							label="Note minimale"
							value={draft.ratingMin === undefined ? "" : String(draft.ratingMin)}
							options={RATINGS}
							onChange={(value) => patch({ ratingMin: number(value) })}
						/>
					</div>

					<div className="flex flex-wrap items-end gap-3">
						<label className="flex flex-col gap-1.5">
							<span className="text-xs text-muted">Âge minimum</span>
							<input
								type="number"
								min={18}
								max={120}
								value={draft.ageMin ?? ""}
								placeholder="18"
								onChange={(event) => patch({ ageMin: number(event.target.value) })}
								className={`${FIELD} w-24`}
							/>
						</label>
						<label className="flex flex-col gap-1.5">
							<span className="text-xs text-muted">Âge maximum</span>
							<input
								type="number"
								min={18}
								max={120}
								value={draft.ageMax ?? ""}
								placeholder="120"
								onChange={(event) => patch({ ageMax: number(event.target.value) })}
								className={`${FIELD} w-24`}
							/>
						</label>
					</div>

					<div className="flex flex-wrap justify-end gap-3">
						{count(draft) > 0 ? (
							<div className="w-40">
								<ActionButton
									type="button"
									tone="secondary"
									onClick={() => setDraft({})}
								>
									Réinitialiser
								</ActionButton>
							</div>
						) : null}
						<div className="w-40">
							<ActionButton type="button" tone="primary" onClick={apply}>
								Appliquer
							</ActionButton>
						</div>
					</div>
				</div>
			) : null}
		</div>
	);
}
