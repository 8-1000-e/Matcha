import { BrandLockup, MatchaBowl, Wordmark } from "@/components/Brand/Brand";
import { ActionLink } from "@/components/Form/Button";
import { Footer } from "@/components/Layout/Footer";
import { Screen } from "@/components/Layout/Screen";

export function HomePage() {
	return (
		<Screen
			center
			centerTop
			top={<BrandLockup />}
			footer={<Footer />}
		>
			<div className="stagger flex flex-col">
				<div className="mx-auto flex size-44 items-center justify-center rounded-full bg-white/50 ring-1 ring-matcha/15">
					<MatchaBowl className="size-24" />
				</div>

				<h1 className="mt-10 text-center">
					<Wordmark split className="text-5xl" />
					<span className="mx-auto mt-5 block h-px w-14 bg-matcha/40" />
				</h1>

				<p className="mt-5 text-center text-xs font-medium tracking-[0.18em] text-muted uppercase">
					Site de rencontre
				</p>

				<div className="mt-12 flex flex-col gap-3">
					<ActionLink href="/signup" tone="primary">
						Créer un compte
					</ActionLink>
					<ActionLink href="/login" tone="secondary">
						Se connecter
					</ActionLink>
				</div>
			</div>
		</Screen>
	);
}
