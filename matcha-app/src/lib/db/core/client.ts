import type Database from "better-sqlite3";
import { getDatabase, prepared } from "./connection";
import { ConstraintError, DatabaseError } from "./errors";
import type { SqlFragment } from "./sql";
import type { SqlValue } from "./values";

function rethrow(fragment: SqlFragment, cause: unknown): never {
	const message = cause instanceof Error ? cause.message : String(cause);
	const code
		= typeof cause === "object" && cause !== null && "code" in cause
			? String((cause as { code: unknown }).code)
			: "SQLITE_ERROR";
	if (code.startsWith("SQLITE_CONSTRAINT")) {
		throw new ConstraintError(message, code, { cause });
	}
	throw new DatabaseError(`${message} — while running: ${fragment.text}`, {
		cause,
	});
}

function bind(fragment: SqlFragment): SqlValue[] {
	return [...fragment.params];
}

export function queryAll<Row>(fragment: SqlFragment): Row[] {
	try {
		return prepared(fragment.text).all(bind(fragment)) as Row[];
	} catch (cause) {
		rethrow(fragment, cause);
	}
}

export function queryOne<Row>(fragment: SqlFragment): Row | undefined {
	try {
		return prepared(fragment.text).get(bind(fragment)) as Row | undefined;
	} catch (cause) {
		rethrow(fragment, cause);
	}
}

export function queryScalar<Value extends SqlValue>(
	fragment: SqlFragment,
): Value | undefined {
	try {
		return prepared(fragment.text).pluck().get(bind(fragment)) as
			| Value
			| undefined;
	} catch (cause) {
		rethrow(fragment, cause);
	}
}

export function execute(fragment: SqlFragment): Database.RunResult {
	try {
		return prepared(fragment.text).run(bind(fragment));
	} catch (cause) {
		rethrow(fragment, cause);
	}
}

export function transaction<Result>(run: () => Result): Result {
	return getDatabase().transaction(run)();
}
