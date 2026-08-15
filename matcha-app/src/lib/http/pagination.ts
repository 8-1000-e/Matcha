import { PAGE_SIZE, pageCount } from "@/lib/db";
import type { Validated } from "@/lib/profile/validation";

export interface Page {
	page: number;
	pages: number;
	total: number;
	limit: number;
	offset: number;
}

export function validatePage(raw: string | null): Validated<number> {
	if (raw === null) {
		return { ok: true, value: 1 };
	}

	const page = Number(raw);
	if (!Number.isInteger(page) || page < 1 || page > 1000) {
		return { ok: false, errors: ["page is invalid"] };
	}

	return { ok: true, value: page };
}

export function paginate(page: number, total: number): Page | null {
	const pages = pageCount(total);
	if (page > pages) {
		return null;
	}

	return {
		page,
		pages,
		total,
		limit: PAGE_SIZE,
		offset: (page - 1) * PAGE_SIZE,
	};
}
