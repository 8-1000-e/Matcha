import type Database from "better-sqlite3";
import { INDEXES } from "./indexes";
import { TABLES } from "./tables";
import { TAG_LABELS } from "./tags";
import { TRIGGERS } from "./triggers";
import { VIEWS } from "./views";
export const SCHEMA_VERSION = 4;

function seedTags(database: Database.Database): void {
	const insert = database.prepare(
		"INSERT INTO tags (label) VALUES (?) ON CONFLICT (label) DO NOTHING",
	);
	for (const label of TAG_LABELS) {
		insert.run(label);
	}
}

export function applySchema(database: Database.Database): void {
	const current = database.pragma("user_version", { simple: true }) as number;
	if (current === SCHEMA_VERSION) {
		return;
	}
	database.transaction(() => {
		for (const statement of [...TABLES, ...INDEXES, ...TRIGGERS, ...VIEWS]) {
			database.exec(statement);
		}
		seedTags(database);
	})();
	database.pragma(`user_version = ${SCHEMA_VERSION}`);
}

export function dropSchema(database: Database.Database): void {
	database.pragma("foreign_keys = OFF");
	const objects = database
		.prepare(
			`SELECT type, name FROM sqlite_master
			WHERE name NOT LIKE 'sqlite_%'
				AND type IN ('table', 'view', 'trigger', 'index')`,
		)
		.all() as { type: string; name: string }[];
	database.transaction(() => {
		for (const object of objects) {
			database.exec(`DROP ${object.type.toUpperCase()} IF EXISTS "${object.name}"`);
		}
	})();
	database.pragma("user_version = 0");
	database.pragma("foreign_keys = ON");
}