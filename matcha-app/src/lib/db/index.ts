export {
	execute,
	queryAll,
	queryOne,
	queryScalar,
	transaction,
} from "./core/client";
export { closeDatabase, getDatabase } from "./core/connection";
export { ConstraintError, DatabaseError } from "./core/errors";
export {
	boundedInteger,
	finiteNumber,
	identifier,
	pickKey,
	quoteIdentifier,
} from "./core/identifiers";
export { eq, escapeLike, gt, startsWith } from "./core/operators";
export {
	bounds,
	PAGE_SIZE,
	pageCount,
	type PageBounds,
	type PageOptions,
} from "./core/pagination";
export {
	createRepository,
	type FindOptions,
	type Repository,
	type Sort,
	type Where,
} from "./core/repository";
export {
	empty,
	every,
	isFragment,
	join,
	raw,
	sql,
	when,
	type SqlFragment,
} from "./core/sql";
export {
	createId,
	nowIso,
	plusSeconds,
	toBoolean,
	toFlag,
	toIso,
	type Flag,
	type SqlValue,
} from "./core/values";
export { foldCity, searchCities, type CityRow } from "./queries/cities";
export {
	countCandidates,
	findCandidates,
	findCandidatesByIds,
	findMapCandidates,
	SORT_KEYS,
	type DiscoveryFilters,
	type DiscoveryOptions,
	type DiscoveryRow,
	type DiscoverySort,
	type DiscoverySortKey,
} from "./queries/discovery";
export {
	findFeedSession,
	openFeedSession,
	purgeFeedSessions,
	readFeedPage,
	type FeedPage,
	type FeedSession,
} from "./queries/feed";
export {
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
	type ExportedAccount,
	type ExportedMessage,
} from "./queries/export";
export {
	findPublicProfile,
	type ProfileRelationship,
	type PublicProfile,
} from "./queries/profile";
export {
	findUserSummary,
	SUMMARY_COLUMNS,
	type UserSummaryRow,
} from "./queries/summaries";
export {
	countLiked,
	countLikers,
	findActiveMatchForUsers,
	findMatchBetween,
	hasLiked,
	like,
	likes,
	listLiked,
	listLikers,
	listMatches,
	matches,
	unlike,
	type LikeOutcome,
	type MatchCursor,
	type MatchListOptions,
	type MatchListRow,
	type UnlikeOutcome,
} from "./repositories/likes";
export {
	countUnreadMessages,
	listConversation,
	listUnreadByMatch,
	markConversationRead,
	messages,
	recordCall,
	sendEventMessage,
	sendMessage,
} from "./repositories/messages";
export {
	block,
	blockDirection,
	blocks,
	isBlockedEitherWay,
	type BlockDirection,
	listBlocked,
	report,
	reports,
	unblock,
} from "./repositories/moderation";
export {
	countUnreadNotifications,
	listNotifications,
	markAllNotificationsRead,
	markLinkedNotificationsRead,
	markNotificationRead,
	NOTIFICATION_HISTORY,
	notifications,
	notify,
	pruneNotifications,
} from "./repositories/notifications";
export {
	addPhoto,
	findProfilePhoto,
	hasProfilePhoto,
	listPhotos,
	photos,
	removePhoto,
	replacePhotoPath,
	reorderPhotos,
	setProfilePhoto,
} from "./repositories/photos";
export {
	countViewers,
	countVisitHistory,
	listViewers,
	listVisitHistory,
	profileViews,
	recordView,
} from "./repositories/profileViews";
export {
	findPopularity,
	listVisibleReviews,
	canReview,
	countExchangedMessages,
	removeReview,
	reviews,
	upsertReview,
} from "./repositories/reviews";
export {
	findTagByLabel,
	findTagsByLabels,
	listTags,
	listUserTags,
	resolveTagIds,
	setUserTags,
	tags,
	userTags,
} from "./repositories/tags";
export {
	consumeEmailToken,
	emailTokens,
	findUsableEmailToken,
	findUsableRefreshToken,
	issueEmailToken,
	issueRefreshToken,
	purgeExpiredTokens,
	refreshTokens,
	revokeAllRefreshTokens,
	revokeEmailTokens,
	revokeRefreshToken,
} from "./repositories/tokens";
export {
	createUser,
	deleteUser,
	DELETION_GRACE_DAYS,
	findUserByEmail,
	findUserByUsername,
	isEmailTaken,
	isUsernameTaken,
	listExpiredDeletions,
	markUserDeleted,
	markUserVerified,
	purgeDate,
	refreshProfileCompletion,
	restoreUser,
	type ExpiredAccount,
	setLocation,
	setLocationConsent,
	touchLastSeen,
	updatePassword,
	users,
} from "./repositories/users";
export { purgeIfDue } from "./maintenance";
export { applySchema, dropSchema, SCHEMA_VERSION } from "./schema/apply";
export { onlineNow, PRESENCE_WINDOW_SECONDS } from "./schema/views";
export { TAG_LABELS } from "./schema/tags";
export * from "./types";

export {
	findOAuthAccount,
	findOAuthAccountFor,
	setOAuthRefreshToken,
	linkOAuthAccount,
	listOAuthAccounts,
	oauthAccounts,
	unlinkOAuthAccount,
} from "./repositories/oauth";

export {
	createEvent,
	events,
	findEvent,
	listEvents,
	listUpcomingEvents,
	setEventStatus,
	setGoogleEventId,
	updateEvent,
} from "./repositories/events";

