import { PrivateScreen } from "@/components/Layout/Screen";
import type { CurrentUser } from "@/lib/auth/api";

export function AccountPage({ user }: { user: CurrentUser }) {
	return (
		<PrivateScreen
			title={`Bonjour ${user.first_name}`}
			footer={
				<span className="block text-center">
					Les suggestions, la recherche et le chat arrivent ensuite.
				</span>
			}
		>
			<dl className="flex flex-col gap-4 text-sm">
				<div className="flex items-baseline justify-between gap-4 border-b border-edge/30 pb-4">
					<dt className="text-muted">Nom d’utilisateur</dt>
					<dd className="font-medium">{user.username}</dd>
				</div>
				<div className="flex items-baseline justify-between gap-4 border-b border-edge/30 pb-4">
					<dt className="text-muted">Nom complet</dt>
					<dd className="font-medium">
						{user.first_name} {user.last_name}
					</dd>
				</div>
				<div className="flex items-baseline justify-between gap-4 border-b border-edge/30 pb-4">
					<dt className="text-muted">Adresse e-mail</dt>
					<dd className="font-medium text-matcha">vérifiée</dd>
				</div>
				<div className="flex items-baseline justify-between gap-4">
					<dt className="text-muted">Profil</dt>
					<dd className="font-medium text-matcha">complet</dd>
				</div>
			</dl>
		</PrivateScreen>
	);
}
