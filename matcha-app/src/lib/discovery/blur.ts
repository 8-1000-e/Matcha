import { createHash } from "node:crypto";

export const BLUR_RADIUS_M = 700;

const EARTH_RADIUS_M = 6_371_000;

export interface BlurredPoint {
	latitude: number;
	longitude: number;
}

export function blurPoint(
	id: string,
	latitude: number | null,
	longitude: number | null,
): BlurredPoint | null {
	if (latitude === null || longitude === null) {
		return null;
	}

	const digest = createHash("sha256").update(id).digest();
	const angle = (digest.readUInt32BE(0) / 0xffffffff) * 2 * Math.PI;
	const radius = Math.sqrt(digest.readUInt32BE(4) / 0xffffffff) * BLUR_RADIUS_M;

	const north = (radius * Math.cos(angle)) / EARTH_RADIUS_M;
	const east
		= (radius * Math.sin(angle))
		/ (EARTH_RADIUS_M * Math.cos((latitude * Math.PI) / 180));

	return {
		latitude: latitude + (north * 180) / Math.PI,
		longitude: longitude + (east * 180) / Math.PI,
	};
}
