import { execute, queryScalar, transaction } from "../core/client";
import { ConstraintError, DatabaseError } from "../core/errors";
import { createRepository } from "../core/repository";
import { sql } from "../core/sql";
import { createId } from "../core/values";
import {
	MAX_PHOTOS_PER_USER,
	type PhotoInsert,
	type PhotoRow,
} from "../types";

export const photos = createRepository<PhotoRow, PhotoInsert>({
	table: "photos",
	columns: ["id", "user_id", "path", "is_profile", "position", "created_at"],
	defaultOrder: [{ column: "position", direction: "asc" }],
});

export function listPhotos(userId: string): PhotoRow[] {
	return photos.find({ user_id: userId });
}

export function findProfilePhoto(userId: string): PhotoRow | undefined {
	return photos.findOne({ user_id: userId, is_profile: 1 });
}

export function hasProfilePhoto(userId: string): boolean {
	return photos.exists({ user_id: userId, is_profile: 1 });
}
export function addPhoto(userId: string, path: string): PhotoRow | null {
	try {
		return transaction(() => {
			const used
				= queryScalar<number>(
					sql`SELECT COUNT(*) FROM photos WHERE user_id = ${userId}`,
				) ?? 0;
			if (used >= MAX_PHOTOS_PER_USER) {
				return null;
			}
			const nextPosition
				= queryScalar<number>(
					sql`SELECT COALESCE(MAX(position) + 1, 0) FROM photos
						WHERE user_id = ${userId}`,
				) ?? 0;
			return photos.insert({
				id: createId(),
				user_id: userId,
				path,
				position: nextPosition,
				is_profile: used === 0 ? 1 : 0,
			});
		});
	} catch (error) {
		if (
			error instanceof ConstraintError
			&& error.message.includes("photo_limit_reached")
		) {
			return null;
		}
		throw error;
	}
}
export function setProfilePhoto(
	userId: string,
	photoId: string,
): PhotoRow | null {
	return transaction(() => {
		const target = photos.findOne({ id: photoId, user_id: userId });
		if (target === undefined) {
			return null;
		}
		execute(
			sql`UPDATE photos SET is_profile = 0
				WHERE user_id = ${userId} AND is_profile = 1`,
		);
		const updated = photos.updateById(photoId, { is_profile: 1 });
		if (updated === undefined) {
			throw new DatabaseError("photo_not_found");
		}
		return updated;
	});
}

export function replacePhotoPath(
	userId: string,
	photoId: string,
	path: string,
): PhotoRow | null {
	return transaction(() => {
		const target = photos.findOne({ id: photoId, user_id: userId });
		if (target === undefined) {
			return null;
		}
		return photos.updateById(photoId, { path }) ?? null;
	});
}

export function removePhoto(userId: string, photoId: string): boolean {
	return transaction(() => {
		const target = photos.findOne({ id: photoId, user_id: userId });
		if (target === undefined) {
			return false;
		}
		photos.removeById(photoId);
		const ceiling
			= queryScalar<number>(
				sql`SELECT COALESCE(MAX(position), 0) + 1 FROM photos
					WHERE user_id = ${userId}`,
			) ?? 1;
		execute(
			sql`UPDATE photos SET position = position - ${ceiling}
				WHERE user_id = ${userId} AND position > ${target.position}`,
		);
		execute(
			sql`UPDATE photos SET position = position + ${ceiling - 1}
				WHERE user_id = ${userId} AND position < 0`,
		);
		if (target.is_profile === 1) {
			execute(
				sql`UPDATE photos SET is_profile = 1
					WHERE id = (
						SELECT id FROM photos WHERE user_id = ${userId}
						ORDER BY position LIMIT 1
					)`,
			);
		}
		return true;
	});
}
export function reorderPhotos(
	userId: string,
	orderedIds: string[],
): PhotoRow[] | null {
	return transaction(() => {
		const owned = photos.find({ user_id: userId });
		if (
			owned.length !== orderedIds.length
			|| orderedIds.some((id) => !owned.some((photo) => photo.id === id))
		) {
			return null;
		}
		orderedIds.forEach((id, index) => {
			execute(
				sql`UPDATE photos SET position = ${index - orderedIds.length}
					WHERE id = ${id} AND user_id = ${userId}`,
			);
		});
		execute(
			sql`UPDATE photos SET position = position + ${orderedIds.length}
				WHERE user_id = ${userId}`,
		);
		return photos.find({ user_id: userId });
	});
}