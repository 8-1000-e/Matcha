import type { ReactNode } from "react";

type NoticeProps = {
	className?: string;
	children: ReactNode;
};

export function Notice({ className, children }: NoticeProps) {
	return (
		<p
			role="status"
			className={`popup rounded-xl bg-leaf/70 px-3 py-2.5 text-xs leading-snug ring-1 ring-matcha/20 ${
				className ?? ""
			}`}
		>
			{children}
		</p>
	);
}
