"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { MatchaBowl } from "@/components/Brand/Brand";
import { logout } from "@/lib/auth/api";
import { sharedProfile } from "@/lib/profile/client";

const LINK
	= "flex size-11 items-center justify-center rounded-xl transition-colors duration-200 ease-out";

function FeedIcon() {
	return (
		<svg
			viewBox="0 0 24 24"
			className="size-5"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.8"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			<path d="M4 6h16M4 12h16M4 18h10" />
		</svg>
	);
}

function MessagesIcon() {
	return (
		<svg
			viewBox="0 0 24 24"
			className="size-5"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.8"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			<path d="M21 12a8 8 0 0 1-11.4 7.2L4 20l1-4.4A8 8 0 1 1 21 12Z" />
		</svg>
	);
}

function HeartIcon() {
	return (
		<svg
			viewBox="0 0 24 24"
			className="size-5"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.8"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			<path d="M12 20S3 15.5 3 9.4A4.9 4.9 0 0 1 12 6.6a4.9 4.9 0 0 1 9 2.8C21 15.5 12 20 12 20Z" />
		</svg>
	);
}

function EyeIcon() {
	return (
		<svg
			viewBox="0 0 24 24"
			className="size-5"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.8"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			<path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6-10-6-10-6Z" />
			<circle cx="12" cy="12" r="2.6" />
		</svg>
	);
}

function SettingsIcon() {
	return (
		<svg
			viewBox="0 0 24 24"
			className="size-5"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.8"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			<circle cx="12" cy="12" r="3" />
			<path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 9 19.4a1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 4.6 9a1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1Z" />
		</svg>
	);
}

function DoorIcon() {
	return (
		<svg
			viewBox="0 0 24 24"
			className="size-5"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.8"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			<path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h8" />
			<path d="M17 9l3 3-3 3" />
			<path d="M20 12h-8" />
		</svg>
	);
}

export function AppNav() {
	const pathname = usePathname();
	const router = useRouter();
	const [pending, start] = useTransition();
	const [avatar, setAvatar] = useState<string | null>(null);

	useEffect(() => {
		let live = true;
		void sharedProfile().then((result) => {
			if (!live || !result.ok) {
				return;
			}
			const photo = result.data.profile.photos.find((entry) => entry.is_profile)
				?? result.data.profile.photos[0];
			setAvatar(photo?.url ?? null);
		});
		return () => {
			live = false;
		};
	}, []);

	function signOut() {
		start(async () => {
			await logout();
			router.push("/login");
			router.refresh();
		});
	}

	const links = [
		{ href: "/feed", label: "Suggestions", icon: <FeedIcon /> },
		{ href: "/messages", label: "Messages", icon: <MessagesIcon /> },
		{ href: "/likes", label: "Likes reçus", icon: <HeartIcon /> },
		{ href: "/views", label: "Visites", icon: <EyeIcon /> },
		{ href: "/settings", label: "Réglages", icon: <SettingsIcon /> },
	];

	return (
		<nav
			aria-label="Navigation principale"
			className="sticky top-0 flex h-dvh w-16 shrink-0 flex-col items-center justify-between border-r border-edge/30 bg-white/60 py-4 backdrop-blur-sm"
		>
			<div className="flex flex-col items-center gap-2">
				<Link href="/feed" aria-label="Accueil" className={LINK}>
					<MatchaBowl className="size-6" />
				</Link>

				{links.map((link) => {
					const active = pathname === link.href
						|| pathname.startsWith(`${link.href}/`);
					return (
						<Link
							key={link.href}
							href={link.href}
							aria-label={link.label}
							aria-current={active ? "page" : undefined}
							className={`${LINK} ${
								active
									? "bg-leaf/70 text-matcha-dark"
									: "text-muted hover:bg-leaf/40 hover:text-ink"
							}`}
						>
							{link.icon}
						</Link>
					);
				})}
			</div>

			<div className="flex flex-col items-center gap-2">
				<Link
					href="/me"
					aria-label="Mon profil"
					aria-current={pathname === "/me" ? "page" : undefined}
					className={`relative size-10 overflow-hidden rounded-full bg-leaf/60 ring-2 transition-colors duration-200 ease-out ${
						pathname === "/me" ? "ring-matcha" : "ring-edge/30 hover:ring-matcha/60"
					}`}
				>
					{avatar === null ? (
						<span className="flex size-full items-center justify-center">
							<MatchaBowl className="size-5 opacity-40" />
						</span>
					) : (
						<Image
							src={avatar}
							alt=""
							fill
							priority
							unoptimized
							sizes="40px"
							className="object-cover"
						/>
					)}
				</Link>

				<button
					type="button"
					onClick={signOut}
					disabled={pending}
					aria-label="Se déconnecter"
					className={`${LINK} cursor-pointer text-red-700 hover:bg-red-50 disabled:cursor-progress`}
				>
					<DoorIcon />
				</button>
			</div>
		</nav>
	);
}
