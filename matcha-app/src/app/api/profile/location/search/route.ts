import { requireSession } from "@/lib/auth/guards";
import { searchPlaces } from "@/lib/profile/geocoding";

export async function GET(request: Request)
{
	const session = await requireSession();
	if (!session.ok)
	{
		return session.response;
	}

	const query = new URL(request.url).searchParams.get("q") ?? "";
	return Response.json({ places: await searchPlaces(query) });
}
