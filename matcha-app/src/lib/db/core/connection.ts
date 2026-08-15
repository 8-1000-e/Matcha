import { join as joinPath } from "node:path";
import Database from "better-sqlite3";
import { applySchema } from "../schema/apply";
import { loadCities } from "./cities";
import { DatabaseError } from "./errors";

const EARTH_RADIUS_KM = 6371;

interface Connection {
	database: Database.Database;
	statements: Map<string, Database.Statement>;
}

const globalConnection = globalThis as typeof globalThis & {
	matchaConnection?: Connection;
};

function resolveFile(): string {
	const configured = process.env.DATABASE_PATH;
	if (configured !== undefined && configured.length > 0) {
		return configured;
	}
	return joinPath(process.cwd(), "matcha.db");
}

function toRadians(degrees: number): number {
	return (degrees * Math.PI) / 180;
}

function haversine(
	latitudeA: number | null,
	longitudeA: number | null,
	latitudeB: number | null,
	longitudeB: number | null,
): number | null {
	if (
		latitudeA === null
		|| longitudeA === null
		|| latitudeB === null
		|| longitudeB === null
	) {
		return null;
	}
	const deltaLatitude = toRadians(latitudeB - latitudeA);
	const deltaLongitude = toRadians(longitudeB - longitudeA);
	const half
		= Math.sin(deltaLatitude / 2) ** 2
		+ Math.cos(toRadians(latitudeA))
		* Math.cos(toRadians(latitudeB))
		* Math.sin(deltaLongitude / 2) ** 2;
	return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(half)));
}

function openDatabase(file: string): Database.Database {
	let database: Database.Database;
	try {
		database = new Database(file);
	} catch (cause) {
		throw new DatabaseError(`Unable to open the database at ${file}`, { cause });
	}
	database.pragma("journal_mode = WAL");
	database.pragma("foreign_keys = ON");
	database.pragma("busy_timeout = 5000");
	database.pragma("synchronous = NORMAL");
	database.function("distance_km", { deterministic: true, safeIntegers: false }, ((
		latitudeA: number | null,
		longitudeA: number | null,
		latitudeB: number | null,
		longitudeB: number | null,
	) => haversine(latitudeA, longitudeA, latitudeB, longitudeB)) as (
		...args: unknown[]
	) => number | null);
	applySchema(database);
	loadCities(database);
	return database;
}

export function getConnection(): Connection {
	const existing = globalConnection.matchaConnection;
	if (existing !== undefined && existing.database.open) {
		return existing;
	}
	const connection: Connection = {
		database: openDatabase(resolveFile()),
		statements: new Map(),
	};
	globalConnection.matchaConnection = connection;
	return connection;
}

export function getDatabase(): Database.Database {
	return getConnection().database;
}

export function prepared(text: string): Database.Statement {
	const connection = getConnection();
	const cached = connection.statements.get(text);
	if (cached !== undefined) {
		return cached;
	}
	const statement = connection.database.prepare(text);
	connection.statements.set(text, statement);
	return statement;
}

export function closeDatabase(): void {
	const connection = globalConnection.matchaConnection;
	if (connection === undefined) {
		return;
	}
	connection.statements.clear();
	if (connection.database.open) {
		connection.database.close();
	}
	globalConnection.matchaConnection = undefined;
}
