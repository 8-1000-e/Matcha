"use client";

import { createContext, useContext, type ReactNode } from "react";

// Structure et API reprises du Stepper d'originui (21st.dev), rhabillees a la
// DA du site et sans dependance : la version d'origine tire lucide-react,
// @radix-ui/react-icons et cn (clsx + tailwind-merge), pour un composant que
// le reste du projet ecrit deja a la main.

type StepState = "completed" | "active" | "inactive";

type StepperContextValue = {
	activeStep: number;
	onStepChange?: (step: number) => void;
};

const StepperContext = createContext<StepperContextValue | null>(null);

function useStepper() {
	const context = useContext(StepperContext);
	if (context === null)
	{
		throw new Error("StepperItem must be used inside a Stepper");
	}
	return context;
}

export function Stepper({
	activeStep,
	onStepChange,
	children,
}: {
	activeStep: number;
	onStepChange?: (step: number) => void;
	children: ReactNode;
}) {
	return (
		<StepperContext.Provider value={{ activeStep, onStepChange }}>
			<ol className="flex flex-col">{children}</ol>
		</StepperContext.Provider>
	);
}

export function StepperItem({
	step,
	title,
	state,
	last = false,
	reachable = false,
}: {
	step: number;
	title: string;
	state: StepState;
	last?: boolean;
	reachable?: boolean;
}) {
	const { activeStep, onStepChange } = useStepper();
	const current = step === activeStep;

	const indicator
		= state === "completed"
			? "border-matcha bg-matcha text-white"
			: current
				? "border-matcha bg-white text-matcha"
				: "border-edge/40 bg-white/60 text-muted";

	return (
		<li className="flex gap-3">
			<div className="flex flex-col items-center">
				<span
					aria-hidden="true"
					className={`flex size-8 shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors duration-200 ${indicator}`}
				>
					{state === "completed" ? (
						<svg viewBox="0 0 16 16" className="size-4" fill="none">
							<path
								d="m3.5 8.5 3 3 6-6"
								stroke="currentColor"
								strokeWidth="2"
								strokeLinecap="round"
								strokeLinejoin="round"
							/>
						</svg>
					) : (
						step + 1
					)}
				</span>

				{last ? null : (
					<span
						aria-hidden="true"
						className={`w-0.5 flex-1 transition-colors duration-200 ${
							state === "completed" ? "bg-matcha" : "bg-edge/25"
						}`}
					/>
				)}
			</div>

			<div className={last ? "pb-0" : "pb-6"}>
				{reachable && onStepChange ? (
					<button
						type="button"
						onClick={() => onStepChange(step)}
						aria-current={current ? "step" : undefined}
						className={`cursor-pointer text-left text-sm transition-colors duration-200 hover:text-ink ${
							current ? "font-semibold text-ink" : "text-muted"
						}`}
					>
						{title}
					</button>
				) : (
					<span
						aria-current={current ? "step" : undefined}
						className={`block text-sm ${
							current ? "font-semibold text-ink" : "text-muted"
						}`}
					>
						{title}
					</span>
				)}
			</div>
		</li>
	);
}
