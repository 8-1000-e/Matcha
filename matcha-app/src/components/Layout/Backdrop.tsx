const LEAVES = [
	{ key: "a", position: "top-28 left-6", size: "size-7", duration: "13s" },
	{ key: "b", position: "top-1/3 right-8", size: "size-5", duration: "17s" },
	{ key: "c", position: "bottom-1/3 left-10", size: "size-6", duration: "15s" },
	{ key: "d", position: "bottom-28 right-12", size: "size-8", duration: "19s" },
] as const;

const FOAM_RINGS = [26, 34, 42] as const;

export function Backdrop() {
	return (
		<div
			aria-hidden="true"
			className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
		>
			<div className="blob absolute -top-40 -right-32 size-96 bg-leaf sm:size-[34rem]" />
			<div className="blob-alt absolute -bottom-44 -left-36 size-80 bg-matcha/10 sm:size-[30rem]" />

			<svg
				viewBox="0 0 100 100"
				fill="none"
				className="blob-alt absolute -right-10 bottom-10 size-64 text-matcha/15 sm:size-80"
			>
				{FOAM_RINGS.map((radius) => (
					<circle
						key={radius}
						cx="50"
						cy="50"
						r={radius}
						stroke="currentColor"
						strokeWidth="0.6"
						strokeDasharray="2 6"
					/>
				))}
			</svg>

			{LEAVES.map((leaf) => (
				<svg
					key={leaf.key}
					viewBox="0 0 24 24"
					fill="none"
					className={`sway absolute ${leaf.position} ${leaf.size} text-matcha/15`}
					style={{ animationDuration: leaf.duration }}
				>
					<path d="M12 2c5 4 5 12 0 20-5-8-5-16 0-20Z" fill="currentColor" />
					<path
						d="M12 4v16"
						stroke="var(--color-cream)"
						strokeWidth="1.2"
						strokeLinecap="round"
					/>
				</svg>
			))}
		</div>
	);
}
