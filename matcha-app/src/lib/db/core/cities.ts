import { readFileSync } from "node:fs";
import { join as joinPath } from "node:path";
import { gunzipSync } from "node:zlib";
import type Database from "better-sqlite3";

const DATASET = joinPath(process.cwd(), "data", "cities.tsv.gz");
const COLUMNS = 9;

export function loadCities(database: Database.Database): void
{
	const count = database
		.prepare("SELECT COUNT(*) AS total FROM cities")
		.get() as { total: number };
	if (count.total > 0)
	{
		return;
	}

	let raw: Buffer;
	try
	{
		raw = gunzipSync(readFileSync(DATASET));
	}
	catch
	{
		console.warn(`referentiel de villes introuvable : ${DATASET}`);
		return;
	}

	const insert = database.prepare(
		`INSERT INTO cities
			(id, name, search_name, region, country, country_code,
			 latitude, longitude, population)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
	);

	const load = database.transaction((lines: string[]) =>
	{
		for (const line of lines)
		{
			const parts = line.split("\t");
			if (parts.length !== COLUMNS)
			{
				continue;
			}
			insert.run(
				Number(parts[0]),
				parts[1],
				parts[2],
				parts[3].length === 0 ? null : parts[3],
				parts[4],
				parts[5],
				Number(parts[6]),
				Number(parts[7]),
				Number(parts[8]),
			);
		}
	});

	load(raw.toString("utf8").split("\n"));
}
