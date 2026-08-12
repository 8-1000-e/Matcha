import { randomUUID } from "node:crypto";
import { DatabaseError } from "./errors";

export type SqlValue = string | number | bigint | Uint8Array | null;

export type Flag = 0 | 1;

export function createId(): string {
	return randomUUID();
}

export function nowIso(): string {
	return new Date().toISOString();
}

export function toIso(date: Date): string {
	return date.toISOString();
}

export function plusSeconds(seconds: number): string {
	return new Date(Date.now() + seconds * 1000).toISOString();
}

export function toFlag(value: boolean): Flag {
	return value ? 1 : 0;
}

export function toBoolean(value: number): boolean {
	return value === 1;
}

export function toSqlValue(value: unknown): SqlValue {
	if (value === null || value === undefined) {
		return null;
	}
	if (typeof value === "boolean") {
		return toFlag(value);
	}
	if (value instanceof Date) {
		return toIso(value);
	}
	if (
		typeof value === "string"
		|| typeof value === "number"
		|| typeof value === "bigint"
		|| value instanceof Uint8Array
	) {
		return value;
	}
	throw new DatabaseError(`Unsupported SQL value of type ${typeof value}`);
}
