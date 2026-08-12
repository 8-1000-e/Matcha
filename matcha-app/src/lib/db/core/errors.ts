export class DatabaseError extends Error {
	constructor(message: string, options?: { cause?: unknown }) {
		super(message, options);
		this.name = "DatabaseError";
	}
}

export class ConstraintError extends DatabaseError {
	readonly code: string;

	constructor(message: string, code: string, options?: { cause?: unknown }) {
		super(message, options);
		this.name = "ConstraintError";
		this.code = code;
	}
}
