import { requireSession } from "@/lib/auth/guards";
import { setLocation, setLocationConsent } from "@/lib/db";
import { readJsonBody } from "@/lib/http/body";
import { forwardGeocode, reverseGeocode } from "@/lib/profile/geocoding";
import { profileResponse } from "@/lib/profile/profile";
import { isRecord, validateLocation } from "@/lib/profile/validation";

export async function PUT(request: Request)
{
	const session = await requireSession();
	if (!session.ok)
	{
		return session.response;
	}

	const body = await readJsonBody(request);
	if (!body.ok)
	{
		return body.response;
	}

	const result = validateLocation(body.value);
	if (!result.ok)
	{
		return Response.json({ errors: result.errors }, { status: 400 });
	}

	if (result.value.mode === "gps")
	{
		const place = await reverseGeocode(result.value);
		setLocation(session.user.id, {
			latitude: result.value.latitude,
			longitude: result.value.longitude,
			city: place.city,
			neighborhood: place.neighborhood,
			consent: true,
		});
	}
	else if (result.value.mode === "picked")
	{
		setLocation(session.user.id, {
			latitude: result.value.latitude,
			longitude: result.value.longitude,
			city: result.value.city,
			neighborhood: result.value.neighborhood,
			consent: false,
		});
	}
	else
	{
		const place = await forwardGeocode(result.value.city);
		setLocation(session.user.id, {
			latitude: place?.latitude ?? null,
			longitude: place?.longitude ?? null,
			city: place?.city ?? result.value.city,
			neighborhood: place?.neighborhood ?? null,
			consent: false,
		});
	}

	return profileResponse(session.user.id);
}

export async function PATCH(request: Request)
{
	const session = await requireSession();
	if (!session.ok)
	{
		return session.response;
	}

	const body = await readJsonBody(request);
	if (!body.ok)
	{
		return body.response;
	}

	const consent = isRecord(body.value) ? body.value.consent : undefined;
	if (typeof consent !== "boolean")
	{
		return Response.json(
			{ errors: ["consent must be a boolean"] },
			{ status: 400 },
		);
	}

	if (consent && session.user.latitude === null)
	{
		return Response.json(
			{ errors: ["send your position before enabling tracking"] },
			{ status: 400 },
		);
	}

	setLocationConsent(session.user.id, consent);

	return profileResponse(session.user.id);
}
