const REVIEW_LABEL = "Relecture";

export function StepProgress({
	steps,
	index,
	missing,
	onBack,
	onNext,
}: {
	steps: readonly { key: string; label: string }[];
	index: number;
	missing: string[];
	onBack: () => void;
	onNext: () => void;
}) {
	const reviewing = index === steps.length;
	const done = steps.filter((step) => !missing.includes(step.key)).length;
	const label = reviewing ? REVIEW_LABEL : steps[index].label;

	return (
		<div className="mb-6 flex flex-col gap-2">
			<div className="flex items-center justify-between gap-3">
				<button
					type="button"
					onClick={onBack}
					disabled={index === 0}
					className="-ml-1 flex cursor-pointer items-center gap-1 rounded-lg px-1 py-0.5 text-sm text-muted transition-colors duration-200 hover:text-ink disabled:cursor-not-allowed disabled:opacity-30"
				>
					<svg viewBox="0 0 16 16" className="size-3.5" fill="none" aria-hidden="true">
						<path
							d="M10 3.5 5.5 8l4.5 4.5"
							stroke="currentColor"
							strokeWidth="1.75"
							strokeLinecap="round"
							strokeLinejoin="round"
						/>
					</svg>
					Précédent
				</button>

				<span className="text-sm font-medium">{label}</span>

				<button
					type="button"
					onClick={onNext}
					disabled={reviewing || missing.includes(steps[index].key)}
					className="-mr-1 flex cursor-pointer items-center gap-1 rounded-lg px-1 py-0.5 text-sm text-muted transition-colors duration-200 hover:text-ink disabled:cursor-not-allowed disabled:opacity-30"
				>
					Suivant
					<svg viewBox="0 0 16 16" className="size-3.5" fill="none" aria-hidden="true">
						<path
							d="M6 3.5 10.5 8 6 12.5"
							stroke="currentColor"
							strokeWidth="1.75"
							strokeLinecap="round"
							strokeLinejoin="round"
						/>
					</svg>
				</button>
			</div>

			<ol
				className="flex gap-1"
				aria-label={`Étape ${Math.min(index + 1, steps.length)} sur ${steps.length}`}
			>
				{steps.map((step, position) => {
					const filled = !missing.includes(step.key);
					const current = position === index;

					return (
						<li
							key={step.key}
							aria-current={current ? "step" : undefined}
							className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
								filled ? "bg-matcha" : current ? "bg-matcha/40" : "bg-edge/20"
							}`}
						/>
					);
				})}
			</ol>

			<p className="text-right text-xs text-muted">
				{done} / {steps.length} complété{done > 1 ? "s" : ""}
			</p>
		</div>
	);
}
