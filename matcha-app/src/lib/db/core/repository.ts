import { execute, queryAll, queryOne, queryScalar } from "./client";
import { DatabaseError } from "./errors";
import { boundedInteger, direction, identifier, pickKey } from "./identifiers";
import { eq } from "./operators";
import { every, isFragment, join, raw, sql, type SqlFragment } from "./sql";
import { toSqlValue, type SqlValue } from "./values";

const MAX_LIMIT = 1000;

export type Where<Row> = {
	[Column in keyof Row]?: Row[Column] | readonly SqlValue[] | SqlFragment;
};

export interface Sort<Row> {
	column: keyof Row & string;
	direction?: "asc" | "desc";
}

export interface FindOptions<Row> {
	orderBy?: readonly Sort<Row>[];
	limit?: number;
	offset?: number;
}

export interface Repository<Row extends object, Insert extends object> {
	readonly table: string;
	condition: (where: Where<Row>) => SqlFragment;
	insert: (values: Insert) => Row;
	find: (where?: Where<Row>, options?: FindOptions<Row>) => Row[];
	findOne: (where: Where<Row>, options?: FindOptions<Row>) => Row | undefined;
	findById: (id: SqlValue) => Row | undefined;
	update: (where: Where<Row>, values: Partial<Insert>) => Row[];
	updateById: (id: SqlValue, values: Partial<Insert>) => Row | undefined;
	remove: (where: Where<Row>) => number;
	removeById: (id: SqlValue) => boolean;
	count: (where?: Where<Row>) => number;
	exists: (where: Where<Row>) => boolean;
}

function assignments<Insert extends object>(
	values: Partial<Insert>,
	allowed: readonly string[],
): SqlFragment {
	const entries = Object.entries(values).filter(
		([, value]) => value !== undefined,
	);
	if (entries.length === 0) {
		throw new DatabaseError("Expected at least one column to update");
	}
	return join(
		entries.map(([column, value]) => {
			const key = pickKey(column, allowed, "column");
			return sql`${identifier(key)} = ${toSqlValue(value)}`;
		}),
	);
}

export function createRepository<
	Row extends object,
	Insert extends object = Row,
>(config: {
	table: string;
	columns: readonly (keyof Row & string)[];
	primaryKey?: keyof Row & string;
	defaultOrder?: readonly Sort<Row>[];
}): Repository<Row, Insert> {
	const table = identifier(config.table);
	const allowed = config.columns as readonly string[];
	const primaryKey = config.primaryKey ?? "id";

	function condition(where: Where<Row>): SqlFragment {
		const entries = Object.entries(where).filter(
			([, value]) => value !== undefined,
		);
		return every(
			entries.map(([column, value]) => {
				const key = pickKey(column, allowed, "column");
				const target = identifier(key);
				if (isFragment(value)) {
					return sql`${target} ${value}`;
				}
				if (Array.isArray(value)) {
					return sql`${target} IN (${value.map(toSqlValue)})`;
				}
				return sql`${target} ${eq(value)}`;
			}),
		);
	}

	function ordering(options?: FindOptions<Row>): SqlFragment {
		const sorts = options?.orderBy ?? config.defaultOrder ?? [];
		if (sorts.length === 0) {
			return raw("");
		}
		const parts = sorts.map((sort) => {
			const key = pickKey(sort.column, allowed, "sort column");
			return sql`${identifier(key)} ${direction(sort.direction ?? "asc")}`;
		});
		return sql` ORDER BY ${join(parts)}`;
	}

	function window(options?: FindOptions<Row>): SqlFragment {
		const limit
			= options?.limit === undefined
				? raw("")
				: sql` LIMIT ${boundedInteger(options.limit, 0, MAX_LIMIT, "limit")}`;
		const offset
			= options?.offset === undefined
				? raw("")
				: sql` OFFSET ${boundedInteger(
					options.offset,
					0,
					Number.MAX_SAFE_INTEGER,
					"offset",
				)}`;
		return join([limit, offset], "");
	}

	function insertOne(values: Insert): Row {
		const entries = Object.entries(values).filter(
			([, value]) => value !== undefined,
		);
		if (entries.length === 0) {
			throw new DatabaseError(`Expected values to insert into ${config.table}`);
		}
		const names = entries.map(([column]) =>
			identifier(pickKey(column, allowed, "column")),
		);
		const params = entries.map(([, value]) => sql`${toSqlValue(value)}`);
		const row = queryOne<Row>(
			sql`INSERT INTO ${table} (${join(names)}) VALUES (${join(
				params,
			)}) RETURNING *`,
		);
		if (row === undefined) {
			throw new DatabaseError(`Insert into ${config.table} returned no row`);
		}
		return row;
	}

	return {
		table: config.table,
		condition,
		insert: insertOne,
		find: (where, options) =>
			queryAll<Row>(
				sql`SELECT * FROM ${table} WHERE ${condition(where ?? {})}${ordering(
					options,
				)}${window(options)}`,
			),
		findOne: (where, options) =>
			queryOne<Row>(
				sql`SELECT * FROM ${table} WHERE ${condition(where)}${ordering(
					options,
				)} LIMIT 1`,
			),
		findById: (id) =>
			queryOne<Row>(
				sql`SELECT * FROM ${table} WHERE ${identifier(primaryKey)} = ${id} LIMIT 1`,
			),
		update: (where, values) =>
			queryAll<Row>(
				sql`UPDATE ${table} SET ${assignments(
					values,
					allowed,
				)} WHERE ${condition(where)} RETURNING *`,
			),
		updateById: (id, values) =>
			queryOne<Row>(
				sql`UPDATE ${table} SET ${assignments(
					values,
					allowed,
				)} WHERE ${identifier(primaryKey)} = ${id} RETURNING *`,
			),
		remove: (where) =>
			execute(sql`DELETE FROM ${table} WHERE ${condition(where)}`).changes,
		removeById: (id) =>
			execute(
				sql`DELETE FROM ${table} WHERE ${identifier(primaryKey)} = ${id}`,
			).changes > 0,
		count: (where) =>
			queryScalar<number>(
				sql`SELECT COUNT(*) FROM ${table} WHERE ${condition(where ?? {})}`,
			) ?? 0,
		exists: (where) =>
			queryScalar<number>(
				sql`SELECT 1 FROM ${table} WHERE ${condition(where)} LIMIT 1`,
			) === 1,
	};
}
