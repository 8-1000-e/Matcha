import type Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { BrandLockup } from "@/components/Brand/Brand";
import { BackLink } from "@/components/Form/Button";
import { LogoutButton } from "@/components/Form/LogoutButton";
import { Backdrop } from "@/components/Layout/Backdrop";
import { NotificationBell } from "@/components/Notifications/NotificationBell";
import { PresenceHeartbeat } from "@/components/Presence/PresenceHeartbeat";

type ScreenProps = {
	top: ReactNode;
	children: ReactNode;
	footer: ReactNode;
	center?: boolean;
	centerTop?: boolean;
	
	width?: "narrow" | "wide";
};

const WIDTHS = {
	narrow: "max-w-sm",
	wide: "max-w-4xl",
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
				className={`mx-auto flex w-full ${max} flex-1 flex-col px-6 ${
					width === "wide" ? "py-6" : "py-10"
				} ${center ? "justify-center" : ""}`}
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
	title?: string;
	intro?: string;
	children: ReactNode;
	footer: ReactNode;
	width?: "narrow" | "wide";
	center?: boolean;
	verified?: boolean;
};

export function PrivateScreen({
	title,
	intro,
	children,
	footer,
	width = "narrow",
	center = false,
	verified = true,
}: PrivateScreenProps) {
	return (
		<Screen
			width={width}
			center={center}
			top={
				<div className="flex w-full items-center justify-between gap-3">
					{verified ? <PresenceHeartbeat /> : null}
					<BrandLockup />
					<div className="flex items-center gap-1">
						{verified ? <NotificationBell /> : null}
						<LogoutButton />
					</div>
				</div>
			}
			footer={footer}
		>
			{title ? (
				<h1
					className={`font-semibold tracking-tight ${
						width === "wide" ? "text-xl" : "text-2xl"
					}`}
				>
					{title}
				</h1>
			) : null}
			{intro ? (
				<p className={`text-sm text-muted ${width === "wide" ? "mt-1.5" : "mt-3"}`}>
					{intro}
				</p>
			) : null}

			<div className={title || intro ? (width === "wide" ? "mt-6" : "mt-8") : ""}>
				{children}
			</div>
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