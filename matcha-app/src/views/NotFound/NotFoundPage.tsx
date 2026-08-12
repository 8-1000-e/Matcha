import { MatchaBowl, Wordmark } from "@/components/Brand/Brand";
import { ActionLink } from "@/components/Form/Button";
import { Screen } from "@/components/Layout/Screen";

export function NotFoundPage() {
	return (
		<Screen
			center
			centerTop
			top={<Wordmark className="text-base text-matcha" />}
			footer={<span className="block text-center">Erreur 404</span>}
		>
			<div className="stagger flex flex-col items-center">
				<div className="flex size-32 items-center justify-center rounded-full bg-white/50 ring-1 ring-matcha/15">
					<MatchaBowl className="size-16 opacity-40" />
				</div>

				<h1 className="mt-8 text-center text-2xl font-semibold tracking-tight">
					Ce bol est vide
				</h1>

				<p className="mt-3 text-center text-sm text-muted">
					La page que vous cherchez n’existe pas, ou n’existe plus.
				</p>

				<div className="mt-10 flex w-full flex-col gap-3">
					<ActionLink href="/" tone="primary">
						Retour à l’accueil
					</ActionLink>
					<ActionLink href="/login" tone="secondary">
						Se connecter
					</ActionLink>
				</div>
			</div>
		</Screen>
	);
}
