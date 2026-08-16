import type { CallStatus } from "@/lib/db";

export function callDuration(seconds: number): string {
	const minutes = Math.floor(seconds / 60);
	const rest = seconds % 60;
	if (minutes === 0) {
		return `${rest} s`;
	}
	return `${minutes} min ${String(rest).padStart(2, "0")}`;
}

export function callTimer(seconds: number): string {
	const minutes = Math.floor(seconds / 60);
	const rest = seconds % 60;
	return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

export function callLabel(
	status: CallStatus,
	durationSeconds: number | null,
	mine: boolean,
): string {
	if (status === "answered") {
		return `Appel · ${callDuration(durationSeconds ?? 0)}`;
	}
	if (status === "missed") {
		return mine ? "Appel sans réponse" : "Appel manqué";
	}
	if (status === "declined") {
		return mine ? "Appel refusé" : "Appel décliné";
	}
	return mine ? "Appel annulé" : "Appel manqué";
}
