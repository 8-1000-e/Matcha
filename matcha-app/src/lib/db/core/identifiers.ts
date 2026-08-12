import { DatabaseError } from "./errors";
import { raw, type SqlFragment } from "./sql";

const SAFE_IDENTIFIER = /^[A-Za-z][A-Za-z0-9_]{0,62}$/;

const DIRECTIONS = ["ASC", "DESC"] as const;

export function quoteIdentifier(name: unknown): string {
	if (typeof name !== "string" || !SAFE_IDENTIFIER.test(name)) {
		throw new DatabaseError(`Rejected SQL identifier: ${String(name)}`);
	}
	return `"${name}"`;
}

export function identifier(name: unknown): SqlFragment {
	return raw(quoteIdentifier(name));
}

export function direction(value: unknown): SqlFragment {
	if (typeof value !== "string") {
		throw new DatabaseError(`Rejected sort direction: ${String(value)}`);
	}
	const upper = value.toUpperCase();
	if (!DIRECTIONS.some((allowed) => allowed === upper)) {
		throw new DatabaseError(`Rejected sort direction: ${value}`);
	}
	return raw(upper);
}

export function boundedInteger(
	value: unknown,
	minimum: number,
	maximum: number,
	label: string,
): number {
	if (
		typeof value !== "number"
		|| !Number.isInteger(value)
		|| value < minimum
		|| value > maximum
	) {
		throw new DatabaseError(`Rejected ${label}: ${String(value)}`);
	}
	return value;
}

export function finiteNumber(
	value: unknown,
	minimum: number,
	maximum: number,
	label: string,
): number {
	if (
		typeof value !== "number"
		|| !Number.isFinite(value)
		|| value < minimum
		|| value > maximum
	) {
		throw new DatabaseError(`Rejected ${label}: ${String(value)}`);
	}
	return value;
}

export function pickKey<Key extends string>(
	value: unknown,
	allowed: readonly Key[],
	label: string,
): Key {
	const match = allowed.find((candidate) => candidate === value);
	if (match === undefined) {
		throw new DatabaseError(`Rejected ${label}: ${String(value)}`);
	}
	return match;
}
