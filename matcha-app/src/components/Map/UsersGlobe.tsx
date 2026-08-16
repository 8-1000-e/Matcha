"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { Map as MapLibre, Marker, NavigationControl, Popup } from "maplibre-gl";
import { useEffect, useRef, useState } from "react";
import { fetchMapPoints, type MapPoint } from "@/lib/discovery/map";

const DEBOUNCE_MS = 400;

const STYLE = {
	version: 8 as const,
	sources: {
		osm: {
			type: "raster" as const,
			tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
			tileSize: 256,
			attribution: "&copy; OpenStreetMap",
		},
	},
	layers: [
		{ id: "background", type: "background" as const, paint: { "background-color": "#dbe7f5" } },
		{ id: "osm", type: "raster" as const, source: "osm" },
	],
};

function markerElement(point: MapPoint): HTMLElement {
	const wrapper = document.createElement("span");
	wrapper.className = `block size-10 overflow-hidden rounded-full shadow-[0_2px_8px_rgba(38,48,28,0.45)] ring-2 ${
		point.is_online ? "ring-matcha" : "ring-white"
	}`;
	wrapper.style.cursor = "pointer";

	if (point.profile_photo_id === null) {
		const initial = document.createElement("span");
		initial.className
			= "flex size-full items-center justify-center bg-leaf text-sm font-semibold text-matcha-dark";
		initial.textContent = point.first_name.slice(0, 1).toUpperCase();
		wrapper.append(initial);
		return wrapper;
	}

	const image = document.createElement("img");
	image.src = `/api/photos/${point.profile_photo_id}`;
	image.alt = "";
	image.loading = "lazy";
	image.className = "size-full object-cover";
	wrapper.append(image);

	return wrapper;
}

function popupHtml(point: MapPoint): string {
	const distance = point.distance_km === null
		? "distance inconnue"
		: point.distance_km < 1
			? "à moins d’1 km"
			: `à ${Math.round(point.distance_km)} km`;

	return `<span class="flex flex-col gap-1">
		<span class="text-sm font-medium">${point.first_name} · ${point.age} ans</span>
		<span class="text-xs text-muted">${point.city ?? "ville inconnue"} · ${distance}</span>
		<a href="/users/${point.id}" class="text-xs font-medium text-matcha underline decoration-matcha/40 underline-offset-4">Voir le profil</a>
	</span>`;
}

export function UsersGlobe({
	centre,
}: {
	centre: { latitude: number; longitude: number } | null;
}) {
	const container = useRef<HTMLDivElement>(null);
	const map = useRef<MapLibre | null>(null);
	const markers = useRef<Marker[]>([]);
	const timer = useRef<number | null>(null);

	const [count, setCount] = useState(0);
	const [busy, setBusy] = useState(false);
	const [capped, setCapped] = useState(false);

	useEffect(() => {
		if (container.current === null || map.current !== null) {
			return;
		}

		const instance = new MapLibre({
			container: container.current,
			style: STYLE,
			center: centre === null ? [2.4, 46.6] : [centre.longitude, centre.latitude],
			zoom: centre === null ? 2 : 3.5,
			minZoom: 1,
			attributionControl: { compact: true },
		});

		instance.addControl(new NavigationControl({ showCompass: false }), "top-left");
		instance.on("style.load", () => {
			instance.setProjection({ type: "globe" });
			instance.setSky({
				"sky-color": "#cfe3f7",
				"horizon-color": "#eef4e6",
				"fog-color": "#f4f8ee",
				"fog-ground-blend": 0.6,
			});
		});

		function load() {
			if (timer.current !== null) {
				window.clearTimeout(timer.current);
			}
			setBusy(true);
			timer.current = window.setTimeout(() => {
				const bounds = instance.getBounds() as unknown as {
					getSouth: () => number;
					getNorth: () => number;
					getWest: () => number;
					getEast: () => number;
				};

				void fetchMapPoints({
					south: Math.max(-90, bounds.getSouth()),
					north: Math.min(90, bounds.getNorth()),
					west: Math.max(-180, bounds.getWest()),
					east: Math.min(180, bounds.getEast()),
				}).then((result) => {
					setBusy(false);
					if (!result.ok) {
						return;
					}

					for (const marker of markers.current) {
						marker.remove();
					}
					markers.current = result.data.points.map((point) =>
						new Marker({ element: markerElement(point) })
							.setLngLat([point.longitude, point.latitude])
							.setPopup(new Popup({ offset: 22 }).setHTML(popupHtml(point)))
							.addTo(instance),
					);
					setCount(result.data.points.length);
					setCapped(result.data.capped);
				});
			}, DEBOUNCE_MS);
		}

		instance.on("load", load);
		instance.on("moveend", load);
		map.current = instance;

		return () => {
			if (timer.current !== null) {
				window.clearTimeout(timer.current);
			}
			for (const marker of markers.current) {
				marker.remove();
			}
			markers.current = [];
			instance.remove();
			map.current = null;
		};
	}, [centre]);

	return (
		<div className="relative size-full">
			<div ref={container} className="size-full rounded-2xl" />

			<div className="pointer-events-none absolute top-3 right-3 z-10 flex flex-col items-end gap-2">
				<span className="rounded-full bg-cream/95 px-3 py-1.5 text-xs font-medium shadow-sm">
					{busy
						? "Chargement…"
						: `${count} profil${count > 1 ? "s" : ""} visible${count > 1 ? "s" : ""}`}
				</span>
				{capped ? (
					<span className="max-w-56 rounded-lg bg-cream/95 px-3 py-1.5 text-right text-xs text-muted shadow-sm">
						Trop de profils ici : zoomez pour tous les voir.
					</span>
				) : null}
			</div>
		</div>
	);
}
