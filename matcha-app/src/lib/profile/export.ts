import {
	exportAccount,
	exportBlocks,
	exportEvents,
	exportLikesGiven,
	exportLikesReceived,
	exportMatches,
	exportMessages,
	exportNotifications,
	exportOAuthAccounts,
	exportPhotos,
	exportReports,
	exportReviewsReceived,
	exportReviewsWritten,
	exportSessions,
	exportTags,
	exportViewsMade,
	exportViewsReceived,
	nowIso,
	type ExportedAccount,
	type MessageKind,
} from "@/lib/db";

type Decoder = (kind: MessageKind, body: string | null) => string | null;

export interface ExportPayload {
	exported_at: string;
	notice: string;
	account: ExportedAccount;
	tags: unknown[];
	photos: unknown[];
	likes_given: unknown[];
	likes_received: unknown[];
	profile_views_made: unknown[];
	profile_views_received: unknown[];
	matches: unknown[];
	messages: unknown[];
	events: unknown[];
	reviews_written: unknown[];
	reviews_received: unknown[];
	blocked_users: unknown[];
	reports_made: unknown[];
	notifications: unknown[];
	linked_accounts: unknown[];
	sessions: unknown[];
}

const NOTICE
	= "Export RGPD. Les photos ne sont listees que par identifiant : "
	+ "telechargez-les depuis /api/photos/<id> tant que le compte existe. "
	+ "Les autres personnes ne sont designees que par leur nom d'utilisateur.";

export function buildExport(
	userId: string,
	decode: Decoder,
): ExportPayload | null {
	const account = exportAccount(userId);
	if (account === undefined) {
		return null;
	}

	return {
		exported_at: nowIso(),
		notice: NOTICE,
		account,
		tags: exportTags(userId).map((tag) => tag.label),
		photos: exportPhotos(userId),
		likes_given: exportLikesGiven(userId),
		likes_received: exportLikesReceived(userId),
		profile_views_made: exportViewsMade(userId),
		profile_views_received: exportViewsReceived(userId),
		matches: exportMatches(userId),
		messages: exportMessages(userId).map((message) => ({
			...message,
			body: decode(message.kind as MessageKind, message.body),
		})),
		events: exportEvents(userId),
		reviews_written: exportReviewsWritten(userId),
		reviews_received: exportReviewsReceived(userId),
		blocked_users: exportBlocks(userId),
		reports_made: exportReports(userId),
		notifications: exportNotifications(userId),
		linked_accounts: exportOAuthAccounts(userId),
		sessions: exportSessions(userId),
	};
}
