import type { ReactNode } from "react";

type AlertProps = {
	id?: string;
	className?: string;
	children: ReactNode;
};

export function Alert({ id, className, children }: AlertProps) {
	return (
		<p
			id={id}
			role="alert"
			className={`popup flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2.5 text-xs leading-snug text-red-800 ring-1 ring-red-200 ${
				className ?? ""
			}`}
		>
			<svg
				viewBox="0 0 16 16"
				aria-hidden="true"
				className="mt-px size-4 shrink-0"
				fill="currentColor"
			>
				<path d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13Zm-.75 3h1.5l-.15 4h-1.2l-.15-4Zm.75 5.4a.9.9 0 1 1 0 1.8.9.9 0 0 1 0-1.8Z" />
			</svg>
			{children}
		</p>
	);
}
