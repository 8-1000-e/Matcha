"use client";

import "leaflet/dist/leaflet.css";
import { divIcon } from "leaflet";
import Link from "next/link";
import { useMemo } from "react";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import type { Candidate } from "@/lib/discovery/client";

const TILES = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

const ATTRIBUTION
	= '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

function pin(candidate: Candidate) {
	const initial = candidate.first_name.slice(0, 1).toUpperCase();

	return divIcon({
		className: "",
		html: `<span class="flex size-9 items-center justify-center rounded-full border-2 border-white bg-matcha text-sm font-semibold text-white shadow-[0_2px_6px_rgba(38,48,28,0.35)]">${initial}</span>`,
		iconSize: [36, 36],
		iconAnchor: [18, 18],
		popupAnchor: [0, -18],
	});
}

function distance(km: number | null) {
	if (km === null) {
		return "distance inconnue";
	}
	return km < 1 ? "à moins d’1 km" : `à ${Math.round(km)} km`;
}

export function FeedMap({ candidates }: { candidates: Candidate[] }) {
	const placed = useMemo(
		() =>
			candidates.filter(
				(candidate) =>
					candidate.map_latitude !== null && candidate.map_longitude !== null,
			),
		[candidates],
	);

	const centre = useMemo<[number, number]>(() => {
		if (placed.length === 0) {
			return [46.6, 2.4];
		}
		const sum = placed.reduce(
			(total, candidate) => ({
				lat: total.lat + (candidate.map_latitude ?? 0),
				lon: total.lon + (candidate.map_longitude ?? 0),
			}),
			{ lat: 0, lon: 0 },
		);
		return [sum.lat / placed.length, sum.lon / placed.length];
	}, [placed]);

	if (placed.length === 0) {
		return (
			<p className="flex h-full items-center justify-center text-sm text-muted">
				Aucun profil localisé pour ces critères.
			</p>
		);
	}

	return (
		<MapContainer
			center={centre}
			zoom={placed.length === 1 ? 11 : 6}
			scrollWheelZoom
			className="size-full rounded-2xl"
		>
			<TileLayer url={TILES} attribution={ATTRIBUTION} />

			{placed.map((candidate) => (
				<Marker
					key={candidate.id}
					position={[candidate.map_latitude ?? 0, candidate.map_longitude ?? 0]}
					icon={pin(candidate)}
				>
					<Popup>
						<span className="flex flex-col gap-1">
							<span className="text-sm font-medium">
								{candidate.first_name} · {candidate.age} ans
							</span>
							<span className="text-xs text-muted">
								{candidate.city ?? "ville inconnue"} ·{" "}
								{distance(candidate.distance_km)}
							</span>
							<Link
								href={`/users/${candidate.id}`}
								className="text-xs font-medium text-matcha underline decoration-matcha/40 underline-offset-4"
							>
								Voir le profil
							</Link>
						</span>
					</Popup>
				</Marker>
			))}
		</MapContainer>
	);
}
