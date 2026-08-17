"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { Map as MapLibre, Marker, NavigationControl, Popup } from "maplibre-gl";
import { useEffect, useRef, useState } from "react";
import { fetchMapPoints, type MapPoint } from "@/lib/discovery/map";

const DEBOUNCE_MS = 400;

const CELL_PX = 56;

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

function clusterElement(count: number): HTMLElement {
	const wrapper = document.createElement("span");
	const size = count > 99 ? 52 : count > 9 ? 46 : 40;
	wrapper.className
		= "flex items-center justify-center rounded-full bg-matcha font-semibold text-white ring-2 ring-white shadow-[0_2px_8px_rgba(38,48,28,0.45)]";
	wrapper.style.width = `${size}px`;
	wrapper.style.height = `${size}px`;
	wrapper.style.fontSize = count > 99 ? "13px" : "14px";
	wrapper.style.cursor = "pointer";
	wrapper.textContent = count > 999 ? "999+" : String(count);

	return wrapper;
}

function popupNode(point: MapPoint): HTMLElement {
	const distance = point.distance_km === null
		? "distance inconnue"
		: point.distance_km < 1
			? "à moins d’1 km"
			: `à ${Math.round(point.distance_km)} km`;

	const wrapper = document.createElement("span");
	wrapper.className = "flex flex-col gap-1";

	const identity = document.createElement("span");
	identity.className = "text-sm font-medium";
	identity.textContent = `${point.first_name} · ${point.age} ans`;

	const place = document.createElement("span");
	place.className = "text-xs text-muted";
	place.textContent = `${point.city ?? "ville inconnue"} · ${distance}`;

	const link = document.createElement("a");
	link.href = `/users/${encodeURIComponent(point.id)}`;
	link.className
		= "text-xs font-medium text-matcha underline decoration-matcha/40 underline-offset-4";
	link.textContent = "Voir le profil";

	wrapper.append(identity, place, link);

	return wrapper;
}

export function UsersGlobe({
	centre,
}: {
	centre: { latitude: number; longitude: number } | null;
}) {
	const container = useRef<HTMLDivElement>(null);
	const map = useRef<MapLibre | null>(null);
	const markers = useRef<Marker[]>([]);
	const points = useRef<MapPoint[]>([]);
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

		function draw() {
			for (const marker of markers.current) {
				marker.remove();
			}

			const cells = new Map<string, MapPoint[]>();
			for (const point of points.current) {
				const screen = instance.project([point.longitude, point.latitude]);
				const key = `${Math.round(screen.x / CELL_PX)}:${Math.round(screen.y / CELL_PX)}`;
				const bucket = cells.get(key);
				if (bucket === undefined) {
					cells.set(key, [point]);
					continue;
				}
				bucket.push(point);
			}

			markers.current = [...cells.values()].map((bucket) => {
				const first = bucket[0];
				if (bucket.length === 1) {
					return new Marker({ element: markerElement(first) })
						.setLngLat([first.longitude, first.latitude])
						.setPopup(new Popup({ offset: 22 }).setDOMContent(popupNode(first)))
						.addTo(instance);
				}

				const centre = bucket.reduce(
					(total, point) => ({
						lon: total.lon + point.longitude / bucket.length,
						lat: total.lat + point.latitude / bucket.length,
					}),
					{ lon: 0, lat: 0 },
				);
				const element = clusterElement(bucket.length);
				element.addEventListener("click", () => {
					instance.easeTo({
						center: [centre.lon, centre.lat],
						zoom: Math.min(instance.getZoom() + 2.5, 16),
					});
				});

				return new Marker({ element })
					.setLngLat([centre.lon, centre.lat])
					.addTo(instance);
			});
		}

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

					points.current = result.data.points;
					draw();
					setCount(result.data.points.length);
					setCapped(result.data.capped);
				});
			}, DEBOUNCE_MS);
		}

		instance.on("load", load);
		instance.on("moveend", load);
		instance.on("zoomend", draw);
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
