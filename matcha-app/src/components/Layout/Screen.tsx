import type Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { BrandLockup } from "@/components/Brand/Brand";
import { BackLink } from "@/components/Form/Button";
import { LogoutButton } from "@/components/Form/LogoutButton";
import { Backdrop } from "@/components/Layout/Backdrop";

type ScreenProps = {
	top: ReactNode;
	children: ReactNode;
	footer: ReactNode;
	center?: boolean;
	centerTop?: boolean;
	/** Les ecrans a deux colonnes ont besoin de plus que les 384px par defaut. */
	width?: "narrow" | "wide";
};

const WIDTHS = {
	narrow: "max-w-sm",
	wide: "max-w-5xl",
} as const;

export function Screen({
	top,
	children,
	footer,
	center = false,
	centerTop = false,
	width = "narrow",
}: ScreenProps) {
	const max = WIDTHS[width];

	return (
		<>
			<Backdrop />

			<header
				className={`mx-auto flex w-full ${max} px-6 pt-6 ${
					centerTop ? "justify-center" : ""
				}`}
			>
				{top}
			</header>

			<main
				className={`mx-auto flex w-full ${max} flex-1 flex-col px-6 py-10 ${
					center ? "justify-center" : ""
				}`}
			>
				{children}
			</main>

			<footer
				className={`mx-auto w-full ${max} px-6 pb-8 text-sm text-muted ${
					centerTop ? "text-center" : ""
				}`}
			>
				{footer}
			</footer>
		</>
	);
}

type PrivateScreenProps = {
	title: string;
	intro?: string;
	children: ReactNode;
	footer: ReactNode;
	width?: "narrow" | "wide";
};

export function PrivateScreen({
	title,
	intro,
	children,
	footer,
	width = "narrow",
}: PrivateScreenProps) {
	return (
		<Screen
			width={width}
			top={
				<div className="flex w-full items-center justify-between gap-3">
					<BrandLockup />
					<LogoutButton />
				</div>
			}
			footer={footer}
		>
			<h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
			{intro ? <p className="mt-3 text-sm text-muted">{intro}</p> : null}

			<div className="mt-8">{children}</div>
		</Screen>
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
