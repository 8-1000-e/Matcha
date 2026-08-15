import Link from "next/link";

const LINK
	= "underline decoration-edge underline-offset-4 transition-colors"
	+ " duration-200 ease-out hover:text-ink hover:decoration-matcha";

export function Footer() {
	return (
		<span className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center text-xs text-muted">
			<span>Brewmance</span>
			<span aria-hidden="true">·</span>
			<Link href="/privacy" className={LINK}>
				Données personnelles
			</Link>
			<span aria-hidden="true">·</span>
			<span>Projet 42</span>
		</span>
	);
}
