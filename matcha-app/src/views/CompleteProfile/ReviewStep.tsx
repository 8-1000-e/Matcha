"use client";

import { ActionButton } from "@/components/Form/Button";

const LABELS: Record<string, string> = {
	gender: "Genre et orientation",
	biography: "Biographie",
	tags: "Centres d’intérêt",
	location: "Localisation",
	profile_photo: "Photos",
};

export function ReviewStep({
	steps,
	onEdit,
	onFinish,
	pending,
}: {
	steps: readonly { key: string; title: string }[];
	onEdit: (index: number) => void;
	onFinish: () => void;
	pending: boolean;
}) {
	return (
		<div className="flex flex-col gap-6">
			<p className="text-sm text-muted">
				Votre profil est complet. Relisez-le à droite : c’est exactement ce que
				les autres verront. Vous pouvez encore tout modifier.
			</p>

			<ul className="flex flex-col divide-y divide-edge/25">
				{steps.map((step, index) => (
					<li
						key={step.key}
						className="flex items-center justify-between gap-4 py-3"
					>
						<span className="text-sm">{LABELS[step.key] ?? step.title}</span>
						<button
							type="button"
							onClick={() => onEdit(index)}
							className="cursor-pointer text-sm text-matcha underline underline-offset-2 transition-colors duration-200 hover:text-matcha-dark"
						>
							Modifier
						</button>
					</li>
				))}
			</ul>

			<ActionButton
				type="button"
				tone="primary"
				onClick={onFinish}
				disabled={pending}
			>
				{pending ? "Un instant…" : "C’est bon, je continue"}
			</ActionButton>
		</div>
	);
}
