"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { logout } from "@/lib/auth/api";

export function LogoutButton() {
	const router = useRouter();
	const [pending, start] = useTransition();

	function handleClick() {
		start(async () => {
			await logout();
			router.push("/login");
			router.refresh();
		});
	}

	return (
		<button
			type="button"
			onClick={handleClick}
			disabled={pending}
			aria-busy={pending || undefined}
			className="-mr-2 inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-muted transition-colors duration-200 ease-out hover:bg-leaf/60 hover:text-ink disabled:cursor-progress"
		>
			<svg
				viewBox="0 0 16 16"
				fill="none"
				aria-hidden="true"
				className="size-4 shrink-0"
				stroke="currentColor"
				strokeWidth="1.6"
				strokeLinecap="round"
				strokeLinejoin="round"
			>
				<path d="M6.5 13.5H3.5v-11h3" />
				<path d="M9.5 5 12.5 8l-3 3" />
				<path d="M12.5 8H6" />
			</svg>
			{pending ? "Déconnexion…" : "Se déconnecter"}
		</button>
	);
}
