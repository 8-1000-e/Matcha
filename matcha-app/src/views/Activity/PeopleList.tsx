"use client";

import Link from "next/link";
import { PresenceAvatar } from "@/components/Presence/PresenceAvatar";
import type { UserSummary } from "@/lib/profile/summary";

export interface Person extends UserSummary {
	at: string;
	detail?: string;
}

function when(iso: string) {
	return new Date(iso).toLocaleDateString("fr-FR", {
		day: "numeric",
		month: "long",
		hour: "2-digit",
		minute: "2-digit",
	});
}

export function PeopleList({
	people,
	empty,
}: {
	people: Person[] | null;
	empty: string;
}) {
	if (people === null) {
		return <p className="py-16 text-center text-sm text-muted">Chargement…</p>;
	}

	if (people.length === 0) {
		return <p className="py-16 text-center text-sm text-muted">{empty}</p>;
	}

	return (
		<ul className="flex flex-col divide-y divide-edge/20">
			{people.map((person) => (
				<li key={`${person.id}-${person.at}`}>
					<Link
						href={`/users/${person.id}`}
						className="flex items-center gap-4 rounded-lg px-2 py-3 transition-colors duration-200 ease-out hover:bg-leaf/30"
					>
						<PresenceAvatar
							url={person.photo_url}
							name={person.first_name}
							online={person.is_online}
						/>

						<span className="min-w-0 flex-1">
							<span className="block truncate text-sm font-medium">
								{person.first_name}
								<span className="ml-2 font-normal text-muted">
									@{person.username}
								</span>
								<span className="ml-2 font-normal text-muted">
									{person.age} ans
								</span>
							</span>
							<span className="block truncate text-xs text-muted">
								{person.city ?? "Ville inconnue"}
								{person.detail !== undefined ? ` · ${person.detail}` : ""}
							</span>
						</span>

						<span className="shrink-0 text-xs text-muted">{when(person.at)}</span>
					</Link>
				</li>
			))}
		</ul>
	);
}
