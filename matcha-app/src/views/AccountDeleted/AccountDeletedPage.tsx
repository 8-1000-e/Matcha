"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { BrandLockup } from "@/components/Brand/Brand";
import { Alert } from "@/components/Form/Alert";
import { ActionButton } from "@/components/Form/Button";
import { LogoutButton } from "@/components/Form/LogoutButton";
import { Screen } from "@/components/Layout/Screen";
import { restoreAccount } from "@/lib/profile/client";

function when(iso: string) {
	return new Date(iso).toLocaleDateString("fr-FR", {
		day: "numeric",
		month: "long",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
}

export function AccountDeletedPage({ purgeAt }: { purgeAt: string }) {
	const router = useRouter();
	const [error, setError] = useState<string | null>(null);
	const [pending, setPending] = useState(false);

	async function restore() {
		setError(null);
		setPending(true);

		const result = await restoreAccount();
		if (!result.ok) {
			setPending(false);
			setError(result.errors[0]?.message ?? "Restauration impossible.");
			return;
		}

		router.replace("/feed");
		router.refresh();
	}

	return (
		<Screen
			centerTop
			center
			top={<BrandLockup />}
			footer={
				<span className="block text-center">
					<LogoutButton />
				</span>
			}
		>
			<h1 className="text-2xl font-semibold tracking-tight">
				Votre compte est supprimé
			</h1>

			<p className="mt-3 text-sm text-muted">
				Il n’apparaît plus nulle part sur Brewmance : ni dans les suggestions,
				ni dans les recherches, ni sur les profils. Vos données sont conservées
				jusqu’au <strong className="text-ink">{when(purgeAt)}</strong>, puis
				effacées définitivement.
			</p>

			<p className="mt-3 text-sm text-muted">
				Vous pouvez encore revenir en arrière d’ici là. Passé cette date, rien
				ne sera récupérable.
			</p>

			<div className="mt-8 flex flex-col gap-3">
				{error !== null ? <Alert>{error}</Alert> : null}

				<ActionButton
					type="button"
					tone="primary"
					busy={pending}
					onClick={() => void restore()}
				>
					Restaurer mon compte
				</ActionButton>
			</div>
		</Screen>
	);
}
