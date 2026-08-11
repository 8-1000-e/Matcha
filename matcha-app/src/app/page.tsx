export default function Home() {
	return (
		<div className="flex flex-1 items-center justify-center bg-white">
			<main className="flex w-full max-w-2xl flex-col gap-10 px-8 py-24">
				<div className="flex items-center gap-2">
					<span className="h-2 w-2 rounded-full bg-emerald-600" />
					<span className="text-sm font-medium uppercase tracking-widest text-zinc-500">
            Matcha Project
					</span>
				</div>

				<div className="flex flex-col gap-4">
					<h1 className="text-4xl font-semibold tracking-tight text-zinc-900">
            Encore rien ici.
					</h1>
					<p className="max-w-md text-base leading-7 text-zinc-500">
            Le projet démarre. Modifie{" "}
						<code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-sm text-zinc-800">
              page.tsx
						</code>{" "}
            pour commencer à construire.
					</p>
				</div>

				<div className="flex gap-3 border-t border-zinc-200 pt-8 text-sm text-zinc-400">
					<span>v0.1</span>
					<span>·</span>
					<span>Next.js</span>
				</div>
			</main>
		</div>
	);
}