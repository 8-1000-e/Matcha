import { raw, sql, type SqlFragment } from "./sql";

export function escapeLike(value: string): string {
	return value.replace(/[\\%_]/g, "\\$&");
}

export function eq(value: unknown): SqlFragment {
	return value === null ? raw("IS NULL") : sql`= ${value}`;
}

export function gt(value: unknown): SqlFragment {
	return sql`> ${value}`;
}

export function startsWith(value: string): SqlFragment {
	return sql`LIKE ${`${escapeLike(value)}%`} ESCAPE '\\'`;
}
