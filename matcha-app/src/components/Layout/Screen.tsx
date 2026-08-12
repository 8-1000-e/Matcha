import type Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { BackLink } from "@/components/Form/Button";
import { Backdrop } from "@/components/Layout/Backdrop";

type ScreenProps = {
	top: ReactNode;
	children: ReactNode;
	footer: ReactNode;
	center?: boolean;
	centerTop?: boolean;
};

export function Screen({
	top,
	children,
	footer,
	center = false,
	centerTop = false,
}: ScreenProps) {
	return (
		<>
			<Backdrop />

			<header
				className={`mx-auto flex w-full max-w-sm px-6 pt-6 ${
					centerTop ? "justify-center" : ""
				}`}
			>
				{top}
			</header>

			<main
				className={`mx-auto flex w-full max-w-sm flex-1 flex-col px-6 py-10 ${
					center ? "justify-center" : ""
				}`}
			>
				{children}
			</main>

			<footer
				className={`mx-auto w-full max-w-sm px-6 pb-8 text-sm text-muted ${
					centerTop ? "text-center" : ""
				}`}
			>
				{footer}
			</footer>
		</>
	);
}

type FlowScreenProps = {
	back: ComponentProps<typeof Link>["href"];
	title: string;
	intro?: string;
	children: ReactNode;
	footer: ReactNode;
};

export function FlowScreen({
	back,
	title,
	intro,
	children,
	footer,
}: FlowScreenProps) {
	return (
		<Screen top={<BackLink href={back} />} footer={footer}>
			<h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
			{intro ? <p className="mt-3 text-sm text-muted">{intro}</p> : null}

			<div className="mt-8">{children}</div>
		</Screen>
	);
}
