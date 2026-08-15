import type Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { BrandLockup } from "@/components/Brand/Brand";
import { BackLink } from "@/components/Form/Button";
import { LogoutButton } from "@/components/Form/LogoutButton";
import { AppNav } from "@/components/Layout/AppNav";
import { Backdrop } from "@/components/Layout/Backdrop";
import { NotificationBell } from "@/components/Notifications/NotificationBell";
import { LocationSync } from "@/components/Presence/LocationSync";
import { PresenceHeartbeat } from "@/components/Presence/PresenceHeartbeat";

type ScreenProps = {
	top: ReactNode;
	children: ReactNode;
	footer: ReactNode;
	center?: boolean;
	centerTop?: boolean;
	fit?: boolean;
	nav?: boolean;
	
	width?: keyof typeof WIDTHS;
};

const WIDTHS = {
	narrow: "max-w-md",
	wide: "max-w-4xl",
	full: "max-w-6xl",
} as const;

export function Screen({
	top,
	children,
	footer,
	center = false,
	centerTop = false,
	fit = false,
	nav = false,
	width = "narrow",
}: ScreenProps) {
	const max = WIDTHS[width];

	const body = (
		<>

			<header
				className={`mx-auto flex w-full ${max} px-4 pt-4 sm:px-6 sm:pt-6 ${
					centerTop ? "justify-center" : ""
				}`}
			>
				{top}
			</header>

			<main
				className={`mx-auto flex w-full ${max} flex-1 flex-col px-4 sm:px-6 ${
					width === "narrow" ? "py-8 sm:py-10" : "py-5 sm:py-6"
				} ${center ? "justify-center" : ""} ${
					fit ? "sm:min-h-0 sm:overflow-hidden sm:!py-4" : ""
				}`}
			>
				{children}
			</main>

			<footer
				className={`mx-auto w-full ${max} shrink-0 px-4 pb-6 text-sm text-muted sm:px-6 sm:pb-8 ${
					centerTop ? "text-center" : ""
				}`}
			>
				{footer}
			</footer>
		</>
	);

	if (!nav) {
		return (
			<div
				className={fit
					? "flex flex-1 flex-col sm:h-dvh sm:overflow-hidden"
					: "contents"}
			>
				<Backdrop />
				{body}
			</div>
		);
	}

	return (
		<div
			className={`flex flex-1 flex-col sm:flex-row ${
				fit ? "sm:h-dvh sm:overflow-hidden" : ""
			}`}
		>
			<Backdrop />
			<AppNav />
			<div
				className={`flex min-w-0 flex-1 flex-col ${
					fit ? "sm:min-h-0 sm:overflow-hidden" : ""
				}`}
			>
				{body}
			</div>
		</div>
	);
}

type PrivateScreenProps = {
	title?: string;
	intro?: string;
	children: ReactNode;
	footer: ReactNode;
	width?: keyof typeof WIDTHS;
	center?: boolean;
	fit?: boolean;
	verified?: boolean;
};

export function PrivateScreen({
	title,
	intro,
	children,
	footer,
	width = "narrow",
	center = false,
	fit = false,
	verified = true,
}: PrivateScreenProps) {
	return (
		<Screen
			width={width}
			center={center}
			fit={fit}
			nav={verified}
			top={
				<div className="flex w-full items-center justify-between gap-3">
					{verified ? <PresenceHeartbeat /> : null}
					{verified ? <LocationSync /> : null}
					<BrandLockup />
					<div className="flex items-center gap-1">
						{verified ? <NotificationBell /> : <LogoutButton />}
					</div>
				</div>
			}
			footer={footer}
		>
			{title ? (
				<h1
					className={`font-semibold tracking-tight ${
						width === "narrow" ? "text-2xl" : "text-xl"
					}`}
				>
					{title}
				</h1>
			) : null}
			{intro ? (
				<p className={`text-sm text-muted ${width === "narrow" ? "mt-3" : "mt-1.5"}`}>
					{intro}
				</p>
			) : null}

			<div
				className={`${
					title || intro
						? fit
							? "mt-3"
							: width === "narrow"
								? "mt-8"
								: "mt-6"
						: ""
				} ${fit ? "flex min-h-0 flex-1 flex-col" : ""}`}
			>
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