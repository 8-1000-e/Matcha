import type Database from "better-sqlite3";
import { encryptMessage, isEncrypted } from "@/lib/crypto/messages";
import { INDEXES } from "./indexes";
import { MESSAGE_MAX_STORED, messagesTable, TABLES } from "./tables";
import { TAG_LABELS } from "./tags";
import { TRIGGERS } from "./triggers";
import { VIEWS } from "./views";
export const SCHEMA_VERSION = 9;

function addMissingColumns(database: Database.Database): void {
	const columns = database.prepare("PRAGMA table_info(users)").all() as {
		name: string;
	}[];
	if (!columns.some((column) => column.name === "location_updated_at")) {
		database.exec("ALTER TABLE users ADD COLUMN location_updated_at TEXT");
	}
}

function encryptExistingMessages(database: Database.Database): void {
	const table = database
		.prepare(
			"SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'messages'",
		)
		.get() as { sql: string } | undefined;
	if (
		table === undefined
		|| (table.sql.includes(`AND ${MESSAGE_MAX_STORED}`)
			&& table.sql.includes("sent_at TEXT NOT NULL DEFAULT"))
	) {
		return;
	}

	database.exec(messagesTable("messages_rebuilt"));

	const rows = database
		.prepare("SELECT id, match_id, sender_id, body, sent_at, read_at FROM messages")
		.all() as {
			id: string;
			match_id: string;
			sender_id: string;
			body: string;
			sent_at: string;
			read_at: string | null;
		}[];

	const insert = database.prepare(
		`INSERT INTO messages_rebuilt
			(id, match_id, sender_id, body, sent_at, read_at)
		VALUES (?, ?, ?, ?, ?, ?)`,
	);
	for (const row of rows) {
		insert.run(
			row.id,
			row.match_id,
			row.sender_id,
			isEncrypted(row.body) ? row.body : encryptMessage(row.body),
			row.sent_at,
			row.read_at,
		);
	}

	database.exec("DROP TABLE messages");
	database.exec("ALTER TABLE messages_rebuilt RENAME TO messages");
}

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
		for (const statement of TABLES) {
			database.exec(statement);
		}
		addMissingColumns(database);
		encryptExistingMessages(database);
		for (const statement of [...INDEXES, ...TRIGGERS, ...VIEWS]) {
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