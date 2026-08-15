"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { MatchaBowl } from "@/components/Brand/Brand";
import { ViewsButton } from "@/components/Views/ViewsButton";
import { logout } from "@/lib/auth/api";
import { getProfile } from "@/lib/profile/client";

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
		void getProfile().then((result) => {
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

				<ViewsButton />
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
