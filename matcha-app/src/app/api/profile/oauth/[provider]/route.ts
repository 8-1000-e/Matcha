import { requireSession } from "@/lib/auth/guards";
import { listOAuthAccounts, unlinkOAuthAccount } from "@/lib/db";
import { isOAuthProvider } from "@/lib/oauth/providers";

interface Context {
	params: Promise<{ provider: string }>;
}

export async function DELETE(_request: Request, context: Context)
{
	const session = await requireSession();
	if (!session.ok)
	{
		return session.response;
	}

	const { provider } = await context.params;
	if (!isOAuthProvider(provider))
	{
		return Response.json({ errors: ["not found"] }, { status: 404 });
	}

	const linked = listOAuthAccounts(session.user.id);
	if (session.user.has_password !== 1 && linked.length <= 1)
	{
		return Response.json({ errors: ["last_sign_in_method"] }, { status: 409 });
	}

	if (!unlinkOAuthAccount(session.user.id, provider))
	{
		return Response.json({ errors: ["account not linked"] }, { status: 404 });
	}

	return Response.json({ ok: true, removed: true });
}
