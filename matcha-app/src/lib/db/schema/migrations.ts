export const BASE_VERSION = 3;

export const MIGRATIONS: readonly string[] = [
	`UPDATE notifications SET link = replace(link, '/chat/', '/messages/')
		WHERE link LIKE '/chat/%'`,
];
