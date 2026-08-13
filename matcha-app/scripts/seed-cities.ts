import { createWriteStream } from "node:fs";
import { mkdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { pipeline } from "node:stream/promises";
import Database from "better-sqlite3";
import { applySchema } from "../src/lib/db/schema/apply";

const BASE = "https://download.geonames.org/export/dump";
const CACHE = join(process.cwd(), "data", "geonames");
const DATABASE = process.env.DATABASE_PATH ?? join(process.cwd(), "matcha.db");
const PLACE_CLASS = "P";

async function download(name: string)
{
	const target = join(CACHE, name);
	try
	{
		await stat(target);
		console.log(`${name} deja present`);
		return target;
	}
	catch
	{
	}

	console.log(`telechargement de ${name}...`);
	const response = await fetch(`${BASE}/${name}`);
	if (!response.ok)
	{
		throw new Error(`${name}: HTTP ${response.status}`);
	}
	await pipeline(response.body as unknown as NodeJS.ReadableStream, createWriteStream(target));
	return target;
}

async function unzip(zipPath: string, entry: string)
{
	const { execFile } = await import("node:child_process");
	const { promisify } = await import("node:util");
	await promisify(execFile)("unzip", ["-o", "-q", zipPath, "-d", CACHE]);
	return join(CACHE, entry);
}

function fold(value: string)
{
	return value
		.normalize("NFD")
		.replace(/\p{Diacritic}/gu, "")
		.toLowerCase();
}

async function main()
{
	await mkdir(CACHE, { recursive: true });

	const zip = await download("cities500.zip");
	const citiesPath = await unzip(zip, "cities500.txt");
	const adminPath = await download("admin1CodesASCII.txt");
	const countryPath = await download("countryInfo.txt");

	const regions = new Map();
	for (const line of (await readFile(adminPath, "utf8")).split("\n"))
	{
		const [code, name] = line.split("\t");
		if (code && name)
		{
			regions.set(code, name);
		}
	}

	const countries = new Map();
	for (const line of (await readFile(countryPath, "utf8")).split("\n"))
	{
		if (line.startsWith("#"))
		{
			continue;
		}
		const parts = line.split("\t");
		if (parts[0] && parts[4])
		{
			countries.set(parts[0], parts[4]);
		}
	}

	const database = new Database(DATABASE);
	database.pragma("journal_mode = WAL");
	applySchema(database);
	database.exec("DELETE FROM cities");

	const insert = database.prepare(
		`INSERT INTO cities
			(id, name, search_name, region, country, country_code,
			 latitude, longitude, population)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
	);

	let kept = 0;
	const load = database.transaction((rows: unknown[][]) =>
	{
		for (const row of rows)
		{
			insert.run(...(row as [number, string, string, string | null, string, string, number, number, number]));
		}
	});

	const batch: unknown[][] = [];
	for (const line of (await readFile(citiesPath, "utf8")).split("\n"))
	{
		const f = line.split("\t");
		if (f.length < 15 || f[6] !== PLACE_CLASS)
		{
			continue;
		}

		const country = countries.get(f[8]);
		if (!country)
		{
			continue;
		}

		batch.push([
			Number(f[0]),
			f[1],
			fold(f[1]),
			regions.get(`${f[8]}.${f[10]}`) ?? null,
			country,
			f[8],
			Number(f[4]),
			Number(f[5]),
			Number(f[14]) || 0,
		]);
		kept += 1;
	}

	load(batch);
	database.close();

	console.log(`${kept} villes chargees dans ${DATABASE}`);
}

main().catch((error: Error) =>
{
	console.error(error.message);
	process.exit(1);
});