import Image from "next/image";

const SIZES = {
	small: {
		frame: "size-9",
		image: "36px",
		initial: "text-sm",
		dot: "size-2.5",
	},
	large: {
		frame: "size-12",
		image: "48px",
		initial: "text-base",
		dot: "size-3",
	},
} as const;

export function PresenceAvatar({
	url,
	name,
	online,
	size = "large",
}: {
	url: string | null;
	name: string;
	online: boolean;
	size?: keyof typeof SIZES;
}) {
	const scale = SIZES[size];

	return (
		<div className={`relative shrink-0 ${scale.frame}`}>
			<div
				className={`relative overflow-hidden rounded-full bg-leaf ${scale.frame} ${
					online
						? "ring-2 ring-matcha/50 ring-offset-2 ring-offset-cream"
						: ""
				}`}
			>
				{url === null ? (
					<span
						className={`flex size-full items-center justify-center font-medium text-matcha-dark ${scale.initial}`}
					>
						{name.slice(0, 1).toUpperCase()}
					</span>
				) : (
					<Image
						src={url}
						alt=""
						fill
						unoptimized
						sizes={scale.image}
						className="object-cover"
					/>
				)}
			</div>

			{online ? (
				<span
					className={`absolute right-0 bottom-0 rounded-full bg-matcha ring-2 ring-cream ${scale.dot}`}
					aria-label="en ligne"
				/>
			) : null}
		</div>
	);
}
