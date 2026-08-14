const TIME = new Intl.DateTimeFormat("fr-FR", {
	hour: "2-digit",
	minute: "2-digit",
});

const DAY = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" });

const FULL = new Intl.DateTimeFormat("fr-FR", {
	day: "numeric",
	month: "short",
	year: "numeric",
});

function startOfDay(date: Date): number {
	return new Date(
		date.getFullYear(),
		date.getMonth(),
		date.getDate(),
	).getTime();
}

function daysApart(value: Date, reference: Date): number {
	return Math.round(
		(startOfDay(reference) - startOfDay(value)) / 86_400_000,
	);
}

export function messageTime(iso: string): string {
	return TIME.format(new Date(iso));
}

export function conversationDate(iso: string): string {
	const value = new Date(iso);
	const apart = daysApart(value, new Date());
	if (apart <= 0) {
		return TIME.format(value);
	}
	if (apart === 1) {
		return "hier";
	}
	if (apart < 365) {
		return DAY.format(value);
	}
	return FULL.format(value);
}

export function dayLabel(iso: string): string {
	const value = new Date(iso);
	const apart = daysApart(value, new Date());
	if (apart <= 0) {
		return "Aujourd’hui";
	}
	if (apart === 1) {
		return "Hier";
	}
	if (apart < 365) {
		return DAY.format(value);
	}
	return FULL.format(value);
}

export function sameDay(first: string, second: string): boolean {
	return startOfDay(new Date(first)) === startOfDay(new Date(second));
}

export function lastSeenLabel(iso: string | null): string {
	if (iso === null) {
		return "hors ligne";
	}
	const value = new Date(iso);
	const apart = daysApart(value, new Date());
	if (apart <= 0) {
		return `vu à ${TIME.format(value)}`;
	}
	if (apart === 1) {
		return "vu hier";
	}
	return `vu le ${DAY.format(value)}`;
}
