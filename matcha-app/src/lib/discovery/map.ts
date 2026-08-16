import { request, type ApiResult } from "@/lib/http/client";

export interface MapPoint {
	id: string;
	first_name: string;
	age: number;
	city: string | null;
	distance_km: number | null;
	is_online: boolean;
	profile_photo_id: string | null;
	latitude: number;
	longitude: number;
}

export interface MapBounds {
	south: number;
	north: number;
	west: number;
	east: number;
}

export function fetchMapPoints(
	bounds: MapBounds,
): Promise<ApiResult<{ points: MapPoint[]; capped: boolean }>> {
	const params = new URLSearchParams({
		south: String(bounds.south),
		north: String(bounds.north),
		west: String(bounds.west),
		east: String(bounds.east),
	});

	return request<{ points: MapPoint[]; capped: boolean }>(
		`/api/discovery/map?${params.toString()}`,
		{ method: "GET" },
	);
}
