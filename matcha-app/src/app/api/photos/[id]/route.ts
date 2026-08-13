import { requireSession } from "@/lib/auth/guards";
import { isBlockedEitherWay, photos } from "@/lib/db";
import { readPhotoFile } from "@/lib/profile/storage";

interface Context {
	params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: Context)
{
	const session = await requireSession();
	if (!session.ok)
	{
		return session.response;
	}

	const { id } = await context.params;
	const photo = photos.findById(id);
	if (!photo)
	{
		return Response.json({ errors: ["photo not found"] }, { status: 404 });
	}
	if (
		photo.user_id !== session.user.id
		&& isBlockedEitherWay(session.user.id, photo.user_id)
	)
	{
		return Response.json({ errors: ["photo not found"] }, { status: 404 });
	}

	const file = await readPhotoFile(photo.path);
	if (!file)
	{
		return Response.json({ errors: ["photo not found"] }, { status: 404 });
	}

	return new Response(new Uint8Array(file.bytes), {
		headers: {
			"content-type": file.mime,
			"content-length": String(file.bytes.byteLength),
			"cache-control": "private, max-age=3600",
			"x-content-type-options": "nosniff",
		},
	});
}