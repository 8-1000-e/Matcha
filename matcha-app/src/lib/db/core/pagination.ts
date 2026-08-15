import { boundedInteger } from "./identifiers";

export const PAGE_SIZE = 20;

export interface PageOptions {
	limit?: number;
	offset?: number;
}

export interface PageBounds {
	limit: number;
	offset: number;
}

export function bounds(options: PageOptions = {}): PageBounds {
	return {
		limit: boundedInteger(options.limit ?? PAGE_SIZE, 1, 100, "limit"),
		offset: boundedInteger(options.offset ?? 0, 0, 100000, "offset"),
	};
}

export function pageCount(total: number, size = PAGE_SIZE): number {
	return Math.max(1, Math.ceil(total / size));
}
