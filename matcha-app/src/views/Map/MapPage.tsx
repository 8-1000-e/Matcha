"use client";

import dynamic from "next/dynamic";
import { PrivateScreen } from "@/components/Layout/Screen";

const UsersGlobe = dynamic(
	() => import("@/components/Map/UsersGlobe").then((module) => module.UsersGlobe),
	{
		ssr: false,
		loading: () => (
			<p className="flex h-full items-center justify-center text-sm text-muted">
				Chargement de la carte…
			</p>
		),
	},
);

export function MapPage({
	centre,
}: {
	centre: { latitude: number; longitude: number } | null;
}) {
	return (
		<PrivateScreen width="full" fit footer={null}>
			<div className="mb-3 shrink-0">
				<h1 className="text-base font-semibold tracking-tight">Carte</h1>
				<p className="text-sm text-muted">
					Les profils qui vous correspondent, à l’endroit approximatif où ils se
					trouvent. Déplacez la carte pour en charger d’autres.
				</p>
			</div>

			<div className="min-h-0 flex-1 overflow-hidden rounded-2xl ring-1 ring-edge/30">
				<UsersGlobe centre={centre} />
			</div>
		</PrivateScreen>
	);
}
