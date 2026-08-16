import { addPhoto, createId } from "@/lib/db";
import {
	detectImage,
	MAX_PHOTO_BYTES,
	normalizeImage,
	removePhotoFile,
	STORED_EXTENSION,
	writePhotoFile,
} from "@/lib/profile/storage";

const ALLOWED_HOSTS = [
	"cdn.intra.42.fr",
	"profile.intra.42.fr",
	"lh3.googleusercontent.com",
];

function allowed(raw: string): URL | null
{
	let url: URL;
	try
	{
		url = new URL(raw);
	}
	catch
	{
		return null;
	}

	if (url.protocol !== "https:" || !ALLOWED_HOSTS.includes(url.hostname))
	{
		return null;
	}

	return url;
}

export async function importAvatar(userId: string, raw: string | null): Promise<boolean>
{
	if (raw === null)
	{
		return false;
	}

	const url = allowed(raw);
	if (url === null)
	{
		return false;
	}

	let bytes: Uint8Array;
	try
	{
		const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
		if (!response.ok)
		{
			return false;
		}

		const buffer = await response.arrayBuffer();
		if (buffer.byteLength === 0 || buffer.byteLength > MAX_PHOTO_BYTES)
		{
			return false;
		}
		bytes = new Uint8Array(buffer);
	}
	catch
	{
		return false;
	}

	if (!detectImage(bytes))
	{
		return false;
	}

	const normalized = await normalizeImage(bytes);
	if (!normalized)
	{
		return false;
	}

	const name = `${createId()}.${STORED_EXTENSION}`;
	await writePhotoFile(name, normalized);

	if (addPhoto(userId, name) === null)
	{
		await removePhotoFile(name);
		return false;
	}

	return true;
}
