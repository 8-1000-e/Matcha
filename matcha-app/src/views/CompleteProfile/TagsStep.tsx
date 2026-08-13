"use client";

import { useState, useTransition } from "react";
import { ActionButton } from "@/components/Form/Button";
import type { AuthError } from "@/lib/auth/errorMessages";
import { TAG_LABELS } from "@/lib/db/schema/tags";
import { saveTags } from "@/lib/profile/client";
import { Errors, type StepProps } from "./StepBase";

const MINIMUM = 3;
const MAXIMUM = 10;

export function TagsStep({ profile, onSaved, onNext }: StepProps) {
	const [selected, setSelected] = useState<string[]>(profile.tags);
	const [filter, setFilter] = useState("");
	const [errors, setErrors] = useState<AuthError[]>([]);
	const [pending, startTransition] = useTransition();

	const visible = TAG_LABELS.filter((label) =>
		label.toLowerCase().includes(filter.trim().toLowerCase()),
	);

	function toggle(label: string) {
		setErrors([]);
		setSelected((current) =>
			current.includes(label)
				? current.filter((entry) => entry !== label)
				: current.length < MAXIMUM
					? [...current, label]
					: current,
		);
	}

	function submit() {
		startTransition(async () => {
			const result = await saveTags(selected);
			if (!result.ok) {
				setErrors(result.errors);
				return;
			}

			setErrors([]);
			onSaved(result.data.profile);
			onNext();
		});
	}

	return (
		<div className="flex flex-col gap-5">
			<div>
				<label htmlFor="tagFilter" className="text-sm font-medium">
					Vos centres d’intérêt
				</label>
				<p className="mt-1 text-xs text-muted">
					Entre {MINIMUM} et {MAXIMUM} choix. {selected.length} sélectionné
					{selected.length > 1 ? "s" : ""}.
				</p>
				<input
					id="tagFilter"
					type="search"
					value={filter}
					onChange={(event) => setFilter(event.target.value)}
					placeholder="Filtrer la liste"
					className="mt-3 w-full rounded-xl border border-edge bg-white/70 px-4 py-2.5 text-base transition-colors duration-200 ease-out focus-visible:border-matcha"
				/>
			</div>

			<div className="relative">
				<div className="flex max-h-56 flex-wrap gap-1.5 overflow-y-auto pb-6">
					{visible.map((label) => {
						const active = selected.includes(label);

						return (
							<button
								key={label}
								type="button"
								onClick={() => toggle(label)}
								aria-pressed={active}
								disabled={!active && selected.length >= MAXIMUM}
								className={`cursor-pointer rounded-full border px-3 py-1.5 text-sm transition-colors duration-200 ease-out disabled:cursor-not-allowed disabled:opacity-40 ${
									active
										? "border-matcha bg-matcha font-medium text-white"
										: "border-edge/60 bg-white/70 hover:border-matcha/50 hover:bg-leaf/40"
								}`}
							>
							#{label}
							</button>
						);
					})}

					{visible.length === 0 ? (
						<p className="px-1 py-2 text-xs text-muted">
						Aucun centre d’intérêt ne correspond.
						</p>
					) : null}
				</div>
				<div
					aria-hidden="true"
					className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-linear-to-t from-cream to-transparent"
				/>
			</div>

			<Errors errors={errors} />

			<ActionButton
				type="button"
				tone="primary"
				onClick={submit}
				disabled={pending || selected.length < MINIMUM}
			>
				{pending ? "Enregistrement…" : "Continuer"}
			</ActionButton>
		</div>
	);
}
