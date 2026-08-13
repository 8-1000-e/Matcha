import { randomUUID } from "node:crypto";
import { setTimeout as wait } from "node:timers/promises";
import {
	normalizeImage,
	STORED_EXTENSION,
	writePhotoFile,
} from "@/lib/profile/storage";

const TIMEOUT_MS = 10000;
const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 2000;

export interface StoredPhoto {
	path: string;
	is_profile: boolean;
	position: number;
}

export async function storePhotos(urls: readonly string[]): Promise<StoredPhoto[]>
{
	const photos: StoredPhoto[] = [];

	for (const url of urls)
	{
		const bytes = await download(url);
		if (bytes === null)
		{
			continue;
		}

		const path = await store(bytes);
		if (path === null)
		{
			continue;
		}

		photos.push({
			path,
			is_profile: photos.length === 0,
			position: photos.length,
		});
	}

	return photos;
}

async function download(url: string, attempt = 1): Promise<Uint8Array | null>
{
	try
	{
		const response = await fetch(url, {
			signal: AbortSignal.timeout(TIMEOUT_MS),
		});
		if (response.ok)
		{
			return new Uint8Array(await response.arrayBuffer());
		}
	}
	catch
	{
	}

	if (attempt >= MAX_ATTEMPTS)
	{
		console.warn(`photo indisponible apres ${MAX_ATTEMPTS} essais : ${url}`);
		return null;
	}

	await wait(RETRY_DELAY_MS * attempt);
	return download(url, attempt + 1);
}

async function store(bytes: Uint8Array): Promise<string | null>
{
	const normalized = await normalizeImage(bytes);
	if (normalized === null)
	{
		return null;
	}

	const name = `${randomUUID()}.${STORED_EXTENSION}`;
	try
	{
		await writePhotoFile(name, normalized);
	}
	catch
	{
		console.warn(`ecriture impossible dans UPLOAD_DIR : ${name}`);
		return null;
	}

	return name;
}
