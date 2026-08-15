"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert } from "@/components/Form/Alert";
import { ActionButton } from "@/components/Form/Button";
import { PrivateScreen } from "@/components/Layout/Screen";
import { unblockUser } from "@/lib/moderation/client";

const COPY = {
	me: {
		title: "Vous avez bloqué ce profil",
		intro:
			"Il n’apparaît plus dans vos suggestions et ne peut plus vous écrire."
			+ " Débloquez-le pour le consulter de nouveau.",
	},
	them: {
		title: "Ce profil n’est plus accessible",
		intro:
			"Il n’est pas ou plus consultable depuis votre compte."
			+ " Vos suggestions restent inchangées.",
	},
} as const;

export function BlockedProfilePage({
	userId,
	by,
}: {
	userId: string;
	by: "me" | "them";
}) {
	const router = useRouter();
	const [error, setError] = useState<string | null>(null);
	const [pending, setPending] = useState(false);
	const copy = COPY[by];

	async function release() {
		setPending(true);
		setError(null);

		const result = await unblockUser(userId);
		if (!result.ok) {
			setPending(false);
			setError(result.errors[0]?.message ?? "Déblocage impossible.");
			return;
		}

		router.refresh();
	}

	return (
		<PrivateScreen width="wide" title={copy.title} intro={copy.intro} footer={null}>
			<div className="flex flex-col gap-4">
				{error !== null ? <Alert>{error}</Alert> : null}

				{by === "me" ? (
					<div className="max-w-56">
						<ActionButton
							type="button"
							tone="primary"
							busy={pending}
							onClick={() => void release()}
						>
							Débloquer
						</ActionButton>
					</div>
				) : null}

				<div className="max-w-56">
					<ActionButton
						type="button"
						tone="secondary"
						onClick={() => router.push("/feed")}
					>
						Retour aux suggestions
					</ActionButton>
				</div>
			</div>
		</PrivateScreen>
	);
}
