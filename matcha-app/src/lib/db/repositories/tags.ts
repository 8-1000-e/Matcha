import { execute, queryAll, transaction } from "../core/client";
import { createRepository } from "../core/repository";
import { sql } from "../core/sql";
import type { TagInsert, TagRow, UserTagRow } from "../types";

export const tags = createRepository<TagRow, TagInsert>({
	table: "tags",
	columns: ["id", "label"],
	defaultOrder: [{ column: "label", direction: "asc" }],
});

export const userTags = createRepository<UserTagRow, UserTagRow>({
	table: "user_tags",
	columns: ["user_id", "tag_id"],
	primaryKey: "user_id",
});

export function listTags(): TagRow[] {
	return tags.find();
}

export function findTagByLabel(label: string): TagRow | undefined {
	return tags.findOne({ label });
}

export function listUserTags(userId: string): TagRow[] {
	return queryAll<TagRow>(
		sql`SELECT tags.* FROM tags
			JOIN user_tags ON user_tags.tag_id = tags.id
			WHERE user_tags.user_id = ${userId}
			ORDER BY tags.label`,
	);
}

export function findTagsByLabels(labels: readonly string[]): TagRow[] {
	if (labels.length === 0) {
		return [];
	}
	return queryAll<TagRow>(
		sql`SELECT * FROM tags WHERE label IN (${[...labels]}) ORDER BY label`,
	);
}

export function resolveTagIds(labels: readonly string[]): number[] {
	if (labels.length === 0) {
		return [];
	}
	return queryAll<{ id: number }>(
		sql`SELECT id FROM tags WHERE label IN (${[...labels]})`,
	).map((row) => row.id);
}

export function setUserTags(userId: string, tagIds: readonly number[]): TagRow[] {
	return transaction(() => {
		execute(sql`DELETE FROM user_tags WHERE user_id = ${userId}`);
		for (const tagId of tagIds) {
			execute(
				sql`INSERT INTO user_tags (user_id, tag_id) VALUES (${userId}, ${tagId})
					ON CONFLICT DO NOTHING`,
			);
		}
		return listUserTags(userId);
	});
}
