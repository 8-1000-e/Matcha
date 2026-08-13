import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import sharp from "sharp";

export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
export const STORED_EXTENSION = "webp";

const MAX_SIDE = 1200;
const MAX_INPUT_PIXELS = 50_000_000;
const QUALITY = 82;

const DIRECTORY = resolve(process.env.UPLOAD_DIR ?? "./data/uploads");
const FILE_NAME_RE = /^[A-Za-z0-9_-]+\.(jpg|png|webp)$/;

const MIME_TYPES: Record<string, string> = {
	jpg: "image/jpeg",
	png: "image/png",
	webp: "image/webp",
};

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

export interface ImageKind {
	extension: string;
	mime: string;
}

function startsWith(bytes: Uint8Array, signature: readonly number[]): boolean
{
	return signature.every((byte, index) => bytes[index] === byte);
}

function reads(bytes: Uint8Array, offset: number, text: string): boolean
{
	return [...text].every(
		(char, index) => bytes[offset + index] === char.charCodeAt(0),
	);
}

export function detectImage(bytes: Uint8Array): ImageKind | null
{
	if (startsWith(bytes, [0xff, 0xd8, 0xff]))
	{
		return { extension: "jpg", mime: MIME_TYPES.jpg };
	}
	if (startsWith(bytes, PNG_SIGNATURE))
	{
		return { extension: "png", mime: MIME_TYPES.png };
	}
	if (bytes.length > 12 && reads(bytes, 0, "RIFF") && reads(bytes, 8, "WEBP"))
	{
		return { extension: "webp", mime: MIME_TYPES.webp };
	}
	return null;
}

export async function normalizeImage(bytes: Uint8Array): Promise<Buffer | null>
{
	try
	{
		return await sharp(bytes, { limitInputPixels: MAX_INPUT_PIXELS })
			.rotate()
			.resize({
				width: MAX_SIDE,
				height: MAX_SIDE,
				fit: "inside",
				withoutEnlargement: true,
			})
			.webp({ quality: QUALITY })
			.toBuffer();
	}
	catch
	{
		return null;
	}
}

function locate(name: string): string | null
{
	if (!FILE_NAME_RE.test(name))
	{
		return null;
	}
	const target = join(DIRECTORY, name);
	return target.startsWith(`${DIRECTORY}/`) ? target : null;
}

export async function writePhotoFile(
	name: string,
	bytes: Uint8Array,
): Promise<void>
{
	const target = locate(name);
	if (target === null)
	{
		throw new Error(`refusing to write ${name}`);
	}
	await mkdir(DIRECTORY, { recursive: true });
	await writeFile(target, bytes, { flag: "wx" });
}

export async function readPhotoFile(
	name: string,
): Promise<{ bytes: Buffer; mime: string } | null>
{
	const target = locate(name);
	if (target === null)
	{
		return null;
	}

	const extension = name.slice(name.lastIndexOf(".") + 1);
	try
	{
		return { bytes: await readFile(target), mime: MIME_TYPES[extension] };
	}
	catch
	{
		return null;
	}
}

export async function removePhotoFile(name: string): Promise<void>
{
	const target = locate(name);
	if (target === null)
	{
		return;
	}
	try
	{
		await unlink(target);
	}
	catch
	{
		return;
	}
}
