"use client";

import {
	useEffect,
	useState,
	type Dispatch,
	type FormEvent,
	type SetStateAction,
} from "react";
import { CalendarIcon } from "@/components/Event/EventIcons";
import { Alert } from "@/components/Form/Alert";
import { ActionButton } from "@/components/Form/Button";
import {
	cancelEvent,
	editEvent,
	joinLocal,
	proposeEvent,
	splitLocal,
	type AppEvent,
} from "@/lib/calendar/client";

const WHEN = new Intl.DateTimeFormat("fr-FR", {
	weekday: "long",
	day: "numeric",
	month: "long",
	hour: "2-digit",
	minute: "2-digit",
});

const FIELD
	= "mt-1.5 min-h-11 w-full cursor-pointer rounded-xl border border-edge/70 bg-white/80 px-3.5 text-sm text-ink accent-matcha transition-colors duration-200 ease-out placeholder:text-muted/70 focus:border-matcha focus:outline-none [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-50 [&::-webkit-calendar-picker-indicator]:hover:opacity-90";

const LABEL = "block text-xs font-medium text-muted";

function openPicker(event: { currentTarget: HTMLInputElement }) {
	event.currentTarget.showPicker?.();
}

function today(): string {
	const now = new Date();

	return new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
		.toISOString()
		.slice(0, 10);
}

function EventCard({
	event,
	mine,
	busy,
	onEdit,
	onCancel,
}: {
	event: AppEvent;
	mine: boolean;
	busy: boolean;
	onEdit: () => void;
	onCancel: () => void;
}) {
	const cancelled = event.status === "cancelled";

	return (
		<li
			className={`rounded-xl border px-4 py-3 ${
				cancelled
					? "border-edge/40 bg-white/40"
					: "border-l-4 border-edge/50 border-l-matcha bg-white/80"
			}`}
		>
			<p
				className={`text-sm font-medium ${cancelled ? "text-muted line-through" : "text-ink"}`}
			>
				{event.title}
			</p>

			<p className="mt-1 text-sm text-ink/80 first-letter:uppercase">
				{WHEN.format(new Date(event.starts_at))}
			</p>

			{event.location === null ? null : (
				<p className="text-sm text-muted">{event.location}</p>
			)}

			<p className="mt-2 text-xs text-muted">
				{cancelled
					? "Annulé"
					: event.synced
						? "Ajouté à vos agendas Google"
						: "Non synchronisé avec Google"}
			</p>

			{mine && !cancelled ? (
				<p className="mt-2.5 flex gap-2">
					<button
						type="button"
						disabled={busy}
						onClick={onEdit}
						className="cursor-pointer rounded-lg border border-edge/60 px-2.5 py-1 text-xs text-ink transition-colors duration-200 ease-out hover:bg-leaf/40 disabled:opacity-60"
					>
						Modifier
					</button>
					<button
						type="button"
						disabled={busy}
						onClick={onCancel}
						className="cursor-pointer rounded-lg px-2.5 py-1 text-xs text-muted transition-colors duration-200 ease-out hover:bg-leaf/40 hover:text-ink disabled:opacity-60"
					>
						Annuler
					</button>
				</p>
			) : null}
		</li>
	);
}

export function EventPanel({
	matchId,
	userId,
	disabled,
	ready,
	open,
	setOpen,
	events,
	setEvents,
}: {
	matchId: string;
	userId: string;
	disabled: boolean;
	ready: boolean;
	open: boolean;
	setOpen: (open: boolean) => void;
	events: AppEvent[];
	setEvents: Dispatch<SetStateAction<AppEvent[]>>;
}) {
	const [busy, setBusy] = useState(false);
	const [section, setSection] = useState<"form" | "list">("form");
	const [error, setError] = useState<string | null>(null);
	const [editing, setEditing] = useState<string | null>(null);
	const [title, setTitle] = useState("");
	const [location, setLocation] = useState("");
	const [day, setDay] = useState("");
	const [startTime, setStartTime] = useState("");
	const [endDay, setEndDay] = useState("");
	const [endTime, setEndTime] = useState("");

	useEffect(() => {
		if (!open) {
			return;
		}
		const onKey = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				setOpen(false);
			}
		};
		window.addEventListener("keydown", onKey);
		return () => {
			window.removeEventListener("keydown", onKey);
		};
	}, [open, setOpen]);

	function reset() {
		setEditing(null);
		setTitle("");
		setLocation("");
		setDay("");
		setStartTime("");
		setEndDay("");
		setEndTime("");
		setError(null);
	}

	function startEdit(event: AppEvent) {
		setSection("form");
		const from = splitLocal(event.starts_at);
		const to = splitLocal(event.ends_at);

		setEditing(event.id);
		setTitle(event.title);
		setLocation(event.location ?? "");
		setDay(from.date);
		setStartTime(from.time);
		setEndDay(to.date);
		setEndTime(to.time);
		setError(null);
	}

	function onSubmit(submit: FormEvent<HTMLFormElement>) {
		submit.preventDefault();
		if (busy) {
			return;
		}
		setBusy(true);
		setError(null);

		const draft = {
			title: title.trim(),
			location: location.trim().length === 0 ? null : location.trim(),
			starts_at: joinLocal(day, startTime),
			ends_at: joinLocal(endDay.length === 0 ? day : endDay, endTime),
		};
		const pending
			= editing === null
				? proposeEvent(matchId, draft)
				: editEvent(matchId, editing, draft);

		void pending.then((result) => {
			setBusy(false);
			if (!result.ok) {
				setError(result.errors[0]?.message ?? null);
				return;
			}
			const desynced
				= "calendar_synced" in result.data && !result.data.calendar_synced;

			setEvents((current) => {
				const others = current.filter((entry) => entry.id !== result.data.event.id);
				return [...others, result.data.event].sort((left, right) =>
					left.starts_at.localeCompare(right.starts_at),
				);
			});
			reset();

			if (desynced) {
				setError("Modification enregistrée, mais l’agenda Google n’a pas suivi.");
				return;
			}
			setOpen(false);
		});
	}

	function onCancel(eventId: string) {
		setBusy(true);
		setError(null);
		void cancelEvent(matchId, eventId).then((result) => {
			setBusy(false);
			if (!result.ok) {
				setError(result.errors[0]?.message ?? null);
				return;
			}
			if (!result.data.calendar_synced) {
				setError("Rendez-vous annulé, mais l’agenda Google n’a pas suivi.");
			}
			setEvents((current) =>
				current.map((entry) =>
					entry.id === eventId ? { ...entry, status: "cancelled" } : entry,
				),
			);
		});
	}

	if (disabled) {
		return null;
	}

	return (
		<>
			<button
				type="button"
				onClick={() => {
					setOpen(true);
				}}
				aria-label="Rendez-vous"
				className="inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-matcha-dark transition-colors duration-200 ease-out hover:bg-leaf/40"
			>
				<CalendarIcon className="size-5" />
			</button>

			{open ? (
				<div
					role="dialog"
					aria-modal="true"
					aria-label="Rendez-vous"
					className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-[2px]"
				>
					<div className="flex max-h-full w-full max-w-md flex-col overflow-hidden rounded-2xl border border-edge/60 bg-cream shadow-xl">
						<div className="flex shrink-0 items-center gap-3 border-b border-edge/40 px-5 py-4">
							<CalendarIcon className="size-5 shrink-0 text-matcha-dark" />

							<h2 className="flex-1 text-base font-medium text-ink">
								Rendez-vous
							</h2>

							<button
								type="button"
								onClick={() => {
									setOpen(false);
									reset();
								}}
								aria-label="Fermer"
								className="inline-flex size-8 cursor-pointer items-center justify-center rounded-lg text-muted transition-colors duration-200 ease-out hover:bg-leaf/40 hover:text-ink"
							>
								<svg
									viewBox="0 0 20 20"
									aria-hidden="true"
									className="size-4"
									fill="none"
									stroke="currentColor"
									strokeWidth="1.8"
									strokeLinecap="round"
								>
									<path d="M5 5l10 10M15 5L5 15" />
								</svg>
							</button>
						</div>

						<div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-5 py-4">
							{!ready ? (
								<p className="text-sm text-muted">Chargement…</p>
							) : events.length === 0 ? (
								<p className="rounded-xl border border-dashed border-edge/60 px-4 py-5 text-center text-sm text-muted">
									Aucun rendez-vous pour l’instant.
								</p>
							) : (
								<div>
									<button
										type="button"
										onClick={() => {
											setSection((current) =>
												current === "list" ? "form" : "list",
											);
										}}
										aria-expanded={section === "list"}
										className="flex w-full cursor-pointer items-center gap-2 rounded-xl border border-edge/50 bg-white/60 px-4 py-2.5 text-left text-sm text-ink transition-colors duration-200 ease-out hover:bg-leaf/30"
									>
										<span className="flex-1">
											Vos rendez-vous
											<span className="ml-1.5 text-muted">({events.length})</span>
										</span>

										<svg
											viewBox="0 0 20 20"
											aria-hidden="true"
											className={`size-4 shrink-0 text-muted transition-transform duration-200 ease-out ${
												section === "list" ? "rotate-180" : ""
											}`}
											fill="none"
											stroke="currentColor"
											strokeWidth="1.8"
											strokeLinecap="round"
											strokeLinejoin="round"
										>
											<path d="M5 7.5 10 12.5 15 7.5" />
										</svg>
									</button>

									{section === "list" ? (
										<ul className="mt-2 flex flex-col gap-2">
											{events.map((event) => (
												<EventCard
													key={event.id}
													event={event}
													mine={event.organiser_id === userId}
													busy={busy}
													onEdit={() => {
														startEdit(event);
													}}
													onCancel={() => {
														onCancel(event.id);
													}}
												/>
											))}
										</ul>
									) : null}
								</div>
							)}

							<form onSubmit={onSubmit} className="flex flex-col gap-3">
								<button
									type="button"
									onClick={() => {
										setSection((current) =>
											current === "form" ? "list" : "form",
										);
									}}
									aria-expanded={section === "form"}
									disabled={events.length === 0}
									className="flex w-full cursor-pointer items-center gap-2 rounded-xl border border-edge/50 bg-white/60 px-4 py-2.5 text-left text-sm text-ink transition-colors duration-200 ease-out hover:bg-leaf/30 disabled:cursor-default disabled:border-transparent disabled:bg-transparent disabled:px-0"
								>
									<span className="flex-1">
										{editing === null ? "Proposer un rendez-vous" : "Modifier"}
									</span>

									{events.length === 0 ? null : (
										<svg
											viewBox="0 0 20 20"
											aria-hidden="true"
											className={`size-4 shrink-0 text-muted transition-transform duration-200 ease-out ${
												section === "form" ? "rotate-180" : ""
											}`}
											fill="none"
											stroke="currentColor"
											strokeWidth="1.8"
											strokeLinecap="round"
											strokeLinejoin="round"
										>
											<path d="M5 7.5 10 12.5 15 7.5" />
										</svg>
									)}
								</button>

								{section !== "form" ? null : (
									<>

										<label className={LABEL}>
									Titre
											<input
												type="text"
												value={title}
												onChange={(event) => {
													setTitle(event.target.value);
												}}
												maxLength={120}
												required
												placeholder="Café, ciné, restaurant…"
												className={FIELD}
											/>
										</label>

										<label className={LABEL}>
									Lieu <span className="font-normal">(facultatif)</span>
											<input
												type="text"
												value={location}
												onChange={(event) => {
													setLocation(event.target.value);
												}}
												maxLength={200}
												placeholder="Adresse ou nom du lieu"
												className={FIELD}
											/>
										</label>

										<label className={LABEL}>
									Date
											<input
												type="date"
												value={day}
												onChange={(event) => {
													setDay(event.target.value);
													if (endDay.length === 0 || endDay < event.target.value) {
														setEndDay(event.target.value);
													}
												}}
												onClick={openPicker}
												min={today()}
												required
												className={FIELD}
											/>
										</label>

										<div className="grid grid-cols-2 gap-3">
											<label className={LABEL}>
										De
												<input
													type="time"
													value={startTime}
													onChange={(event) => {
														setStartTime(event.target.value);
													}}
													onClick={openPicker}
													required
													className={FIELD}
												/>
											</label>

											<label className={LABEL}>
										À
												<input
													type="time"
													value={endTime}
													onChange={(event) => {
														setEndTime(event.target.value);
													}}
													onClick={openPicker}
													required
													className={FIELD}
												/>
											</label>
										</div>

										{endTime.length > 0 && endTime <= startTime ? (
											<label className={LABEL}>
										Date de fin
												<input
													type="date"
													value={endDay}
													onChange={(event) => {
														setEndDay(event.target.value);
													}}
													onClick={openPicker}
													min={day}
													required
													className={FIELD}
												/>
											</label>
										) : null}

										{error === null ? null : <Alert>{error}</Alert>}

										<div className="mt-1 flex gap-2">
											<ActionButton
												type="submit"
												tone="primary"
												busy={busy}
												disabled={busy}
											>
												{editing === null ? "Proposer" : "Enregistrer"}
											</ActionButton>

											{editing === null ? null : (
												<ActionButton type="button" tone="secondary" onClick={reset}>
											Abandonner
												</ActionButton>
											)}
										</div>
									</>
								)}
							</form>
						</div>
					</div>
				</div>
			) : null}
		</>
	);
}
