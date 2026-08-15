const STROKE = {
	fill: "none",
	stroke: "currentColor",
	strokeWidth: 1.8,
	strokeLinecap: "round",
	strokeLinejoin: "round",
} as const;

export function PhoneIcon({ className }: { className?: string }) {
	return (
		<svg viewBox="0 0 20 20" aria-hidden="true" className={className} {...STROKE}>
			<path d="M6.2 3.5 8 7l-1.6 1.4a10 10 0 0 0 5.2 5.2L13 12l3.5 1.8v3a1 1 0 0 1-1.1 1A13.5 13.5 0 0 1 2.7 4.6a1 1 0 0 1 1-1.1z" />
		</svg>
	);
}

export function HangUpIcon({ className }: { className?: string }) {
	return (
		<svg viewBox="0 0 20 20" aria-hidden="true" className={className} {...STROKE}>
			<path d="M2.6 8.6a12 12 0 0 1 14.8 0l-1.6 2.6-3.4-.9-.4-2a10.6 10.6 0 0 0-4 0l-.4 2-3.4.9z" />
		</svg>
	);
}

export function MicIcon({
	className,
	muted,
}: {
	className?: string;
	muted: boolean;
}) {
	return (
		<svg viewBox="0 0 20 20" aria-hidden="true" className={className} {...STROKE}>
			<rect x="7.5" y="2.5" width="5" height="9" rx="2.5" />
			<path d="M4.5 9a5.5 5.5 0 0 0 11 0M10 14.5V17" />
			{muted ? <path d="M3.5 3.5l13 13" /> : null}
		</svg>
	);
}

export function CallArrow({
	className,
	outgoing,
}: {
	className?: string;
	outgoing: boolean;
}) {
	return (
		<svg viewBox="0 0 16 16" aria-hidden="true" className={className} {...STROKE}>
			{outgoing ? (
				<>
					<path d="M4.5 11.5 11.5 4.5" />
					<path d="M6.5 4.5h5v5" />
				</>
			) : (
				<>
					<path d="M11.5 4.5 4.5 11.5" />
					<path d="M9.5 11.5h-5v-5" />
				</>
			)}
		</svg>
	);
}
