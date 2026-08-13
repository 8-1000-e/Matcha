import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

const ACTION =
	"inline-flex min-h-12 w-full cursor-pointer items-center justify-center gap-2.5 rounded-xl px-5 py-3 text-center text-base font-medium transition-colors duration-200 ease-out disabled:cursor-not-allowed disabled:opacity-60";
const BUSY = "cursor-progress disabled:opacity-100";

const TONES = {
	primary: "bg-matcha text-white hover:bg-matcha-dark",
	secondary: "border border-edge bg-white/60 text-ink hover:bg-leaf/50",
} as const;

type Tone = keyof typeof TONES;

function actionClass(tone: Tone, className?: string) {
	return [ACTION, TONES[tone], className].filter(Boolean).join(" ");
}

export function Spinner() {
	return (
		<svg
			viewBox="0 0 16 16"
			aria-hidden="true"
			className="size-4 shrink-0 motion-safe:animate-spin"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
		>
			<circle cx="8" cy="8" r="6" opacity="0.3" />
			<path d="M14 8a6 6 0 0 0-6-6" />
		</svg>
	);
}

export function ActionLink({
	tone,
	className,
	children,
	...props
}: ComponentProps<typeof Link> & { tone: Tone; children: ReactNode }) {
	return (
		<Link className={actionClass(tone, className)} {...props}>
			{children}
		</Link>
	);
}

export function ActionButton({
	tone,
	busy = false,
	className,
	children,
	...props
}: ComponentProps<"button"> & {
	tone: Tone;
	busy?: boolean;
	children: ReactNode;
}) {
	return (
		<button
			{...props}
			disabled={busy || props.disabled}
			aria-busy={busy || undefined}
			className={actionClass(tone, [busy ? BUSY : "", className].join(" ").trim())}
		>
			{busy ? <Spinner /> : null}
			{children}
		</button>
	);
}
export function TextLink({
	className,
	children,
	...props
}: ComponentProps<typeof Link> & { children: ReactNode }) {
	return (
		<Link
			className={`inline-flex min-h-11 items-center justify-center rounded-lg px-2 text-sm underline decoration-matcha/40 underline-offset-4 transition-colors duration-200 ease-out hover:decoration-matcha ${
				className ?? ""
			}`}
			{...props}
		>
			{children}
		</Link>
	);
}

export function BackLink({
	href,
	label = "Retour",
}: {
	href: ComponentProps<typeof Link>["href"];
	label?: string;
}) {
	return (
		<Link
			href={href}
			className="-ml-2 inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-muted transition-colors duration-200 ease-out hover:bg-leaf/60 hover:text-ink"
		>
			<svg
				viewBox="0 0 16 16"
				fill="none"
				aria-hidden="true"
				className="size-4 shrink-0"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
			>
				<path d="M9.5 3.5 5 8l4.5 4.5" />
			</svg>
			{label}
		</Link>
	);
}