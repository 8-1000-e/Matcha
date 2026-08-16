import type Database from "better-sqlite3";
import { encryptMessage, isEncrypted } from "@/lib/crypto/messages";
import { INDEXES } from "./indexes";
import { messagesTable, notificationsTable, TABLES } from "./tables";
import { TAG_LABELS } from "./tags";
import { TRIGGERS } from "./triggers";
import { VIEWS } from "./views";
export const SCHEMA_VERSION = 15;

function addOauthColumns(database: Database.Database): void {
	const columns = database.prepare("PRAGMA table_info(oauth_accounts)").all() as {
		name: string;
	}[];
	if (columns.length > 0 && !columns.some((column) => column.name === "refresh_token")) {
		database.exec("ALTER TABLE oauth_accounts ADD COLUMN refresh_token TEXT");
	}
}

function addMissingColumns(database: Database.Database): void {
	const columns = database.prepare("PRAGMA table_info(users)").all() as {
		name: string;
	}[];
	if (!columns.some((column) => column.name === "location_updated_at")) {
		database.exec("ALTER TABLE users ADD COLUMN location_updated_at TEXT");
	}
	if (!columns.some((column) => column.name === "deleted_at")) {
		database.exec("ALTER TABLE users ADD COLUMN deleted_at TEXT");
	}
	if (!columns.some((column) => column.name === "has_password")) {
		database.exec(
			"ALTER TABLE users ADD COLUMN has_password INTEGER NOT NULL DEFAULT 1",
		);
	}
}

function definitionOf(
	database: Database.Database,
	name: string,
): string | undefined {
	const table = database
		.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = ?")
		.get(name) as { sql: string } | undefined;
	return table?.sql;
}

function dropTriggers(database: Database.Database): void {
	const rows = database
		.prepare(
			"SELECT name FROM sqlite_master WHERE type = 'trigger' AND name NOT LIKE 'sqlite_%'",
		)
		.all() as { name: string }[];
	for (const row of rows) {
		database.exec(`DROP TRIGGER IF EXISTS "${row.name}"`);
	}
}

interface StoredMessage {
	id: string;
	match_id: string;
	sender_id: string;
	body: string;
	sent_at: string;
	read_at: string | null;
}

function rebuildMessages(database: Database.Database): void {
	const definition = definitionOf(database, "messages");
	if (definition === undefined || definition.includes("kind TEXT NOT NULL")) {
		return;
	}

	database.exec(messagesTable("messages_rebuilt"));

	const rows = database
		.prepare("SELECT id, match_id, sender_id, body, sent_at, read_at FROM messages")
		.all() as StoredMessage[];

	const insert = database.prepare(
		`INSERT INTO messages_rebuilt
			(id, match_id, sender_id, kind, body, sent_at, read_at)
		VALUES (?, ?, ?, 'text', ?, ?, ?)`,
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

function rebuildNotifications(database: Database.Database): void {
	const definition = definitionOf(database, "notifications");
	if (definition === undefined || definition.includes("MISSED_CALL")) {
		return;
	}

	database.exec(notificationsTable("notifications_rebuilt"));
	database.exec(
		`INSERT INTO notifications_rebuilt
			(id, recipient_id, actor_id, type, link, created_at, read_at)
		SELECT id, recipient_id, actor_id, type, link, created_at, read_at
		FROM notifications`,
	);
	database.exec("DROP TABLE notifications");
	database.exec("ALTER TABLE notifications_rebuilt RENAME TO notifications");
}

function rebuildEventMessages(database: Database.Database): void {
	const definition = definitionOf(database, "messages");
	if (definition === undefined || definition.includes("'event'")) {
		return;
	}

	database.exec(messagesTable("messages_with_events"));
	database.exec(
		`INSERT INTO messages_with_events
			(id, match_id, sender_id, kind, body, call_status, call_duration_s,
				sent_at, read_at)
		SELECT id, match_id, sender_id, kind, body, call_status, call_duration_s,
			sent_at, read_at
		FROM messages`,
	);
	database.exec("DROP TABLE messages");
	database.exec("ALTER TABLE messages_with_events RENAME TO messages");
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
		addOauthColumns(database);
		dropTriggers(database);
		rebuildMessages(database);
		rebuildEventMessages(database);
		rebuildNotifications(database);
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