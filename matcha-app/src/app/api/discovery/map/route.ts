import { requireSession } from "@/lib/auth/guards";
import { DatabaseError, findMapCandidates } from "@/lib/db";
import { blurPoint, coarseBound, coarseDistance } from "@/lib/discovery/blur";

const MAX_POINTS = 500;

function readBound(
	params: URLSearchParams,
	name: string,
	min: number,
	max: number,
): number | null
{
	const raw = params.get(name);
	if (raw === null)
	{
		return null;
	}

	const value = Number(raw);
	if (!Number.isFinite(value) || value < min || value > max)
	{
		return null;
	}

	return value;
}

export async function GET(request: Request)
{
	const session = await requireSession();
	if (!session.ok)
	{
		return session.response;
	}

	const params = new URL(request.url).searchParams;
	const south = readBound(params, "south", -90, 90);
	const north = readBound(params, "north", -90, 90);
	const west = readBound(params, "west", -180, 180);
	const east = readBound(params, "east", -180, 180);

	if (south === null || north === null || west === null || east === null
		|| south > north)
	{
		return Response.json({ errors: ["invalid bounds"] }, { status: 400 });
	}

	try
	{
		const rows = findMapCandidates(
			session.user,
			{
				south: coarseBound(south),
				north: coarseBound(north),
				west: coarseBound(west),
				east: coarseBound(east),
			},
			MAX_POINTS,
		);

		const points = rows.flatMap((row) => {
			const blurred = blurPoint(row.id, row.latitude, row.longitude);
			if (blurred === null)
			{
				return [];
			}

			return [{
				id: row.id,
				first_name: row.first_name,
				age: row.age,
				city: row.city,
				distance_km: coarseDistance(row.distance_km),
				is_online: row.is_online === 1,
				profile_photo_id: row.profile_photo_id,
				latitude: blurred.latitude,
				longitude: blurred.longitude,
			}];
		});

		return Response.json({ ok: true, points, capped: rows.length >= MAX_POINTS });
	}
	catch (error)
	{
		if (error instanceof DatabaseError && error.message === "profile_incomplete")
		{
			return Response.json({ errors: ["profile_incomplete"] }, { status: 403 });
		}
		throw error;
	}
}
