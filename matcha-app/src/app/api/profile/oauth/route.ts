import { requireSession } from "@/lib/auth/guards";
import { listOAuthAccounts } from "@/lib/db";

export async function GET()
{
	const session = await requireSession();
	if (!session.ok)
	{
		return session.response;
	}

	const accounts = listOAuthAccounts(session.user.id).map((account) => ({
		provider: account.provider,
		email: account.email,
		linked_at: account.linked_at,
	}));

	return Response.json({ ok: true, accounts });
}
