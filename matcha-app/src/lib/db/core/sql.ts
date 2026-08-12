import { DatabaseError } from "./errors";
import { toSqlValue, type SqlValue } from "./values";

const FRAGMENT = Symbol("matcha.sql.fragment");

export interface SqlFragment {
	readonly [FRAGMENT]: true;
	readonly text: string;
	readonly params: readonly SqlValue[];
}

function fragment(text: string, params: readonly SqlValue[]): SqlFragment {
	return { [FRAGMENT]: true, text, params };
}

export function isFragment(value: unknown): value is SqlFragment {
	return typeof value === "object" && value !== null && FRAGMENT in value;
}

export function raw(text: string): SqlFragment {
	return fragment(text, []);
}

export const empty = raw("");

export function sql(
	strings: TemplateStringsArray,
	...values: readonly unknown[]
): SqlFragment {
	if (
		!Array.isArray(strings)
		|| strings.length !== values.length + 1
		|| strings.some((part) => typeof part !== "string")
	) {
		throw new DatabaseError("sql must be used as a template tag");
	}
	let text = strings[0];
	const params: SqlValue[] = [];
	for (let index = 0; index < values.length; index += 1) {
		const value = values[index];
		if (isFragment(value)) {
			text += value.text;
			params.push(...value.params);
		} else if (Array.isArray(value)) {
			if (value.length === 0) {
				text += "SELECT NULL WHERE 0";
			} else {
				text += value.map(() => "?").join(", ");
				params.push(...value.map(toSqlValue));
			}
		} else {
			text += "?";
			params.push(toSqlValue(value));
		}
		text += strings[index + 1];
	}
	return fragment(text, params);
}

export function join(
	parts: readonly SqlFragment[],
	separator = ", ",
): SqlFragment {
	const kept = parts.filter((part) => part.text.length > 0);
	if (kept.length === 0) {
		return empty;
	}
	return fragment(
		kept.map((part) => part.text).join(separator),
		kept.flatMap((part) => [...part.params]),
	);
}

export function every(parts: readonly SqlFragment[]): SqlFragment {
	const kept = parts.filter((part) => part.text.length > 0);
	if (kept.length === 0) {
		return raw("1 = 1");
	}
	return join(
		kept.map((part) => sql`(${part})`),
		" AND ",
	);
}

export function when(
	condition: boolean,
	part: SqlFragment | (() => SqlFragment),
): SqlFragment {
	if (!condition) {
		return empty;
	}
	return typeof part === "function" ? part() : part;
}
