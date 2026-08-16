export function CalendarIcon({ className }: { className?: string }) {
	return (
		<svg
			viewBox="0 0 20 20"
			aria-hidden="true"
			className={className}
			fill="none"
			stroke="currentColor"
			strokeWidth="1.6"
			strokeLinecap="round"
			strokeLinejoin="round"
		>
			<rect x="2.5" y="4" width="15" height="13.5" rx="2.5" />
			<path d="M2.5 8h15M6.5 2.5v3M13.5 2.5v3" />
		</svg>
	);
}
