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
export {
	countCandidates,
	findCandidates,
	type DiscoveryFilters,
	type DiscoveryOptions,
	type DiscoveryRow,
	type DiscoverySort,
	type DiscoverySortKey,
} from "./queries/discovery";
export {
	findPublicProfile,
	type ProfileRelationship,
	type PublicProfile,
} from "./queries/profile";
export {
	findActiveMatchForUsers,
	findMatchBetween,
	hasLiked,
	like,
	likes,
	listLikers,
	listMatches,
	matches,
	unlike,
	type LikeOutcome,
} from "./repositories/likes";
export {
	countUnreadMessages,
	listConversation,
	listUnreadByMatch,
	markConversationRead,
	messages,
	sendMessage,
} from "./repositories/messages";
export {
	block,
	blocks,
	isBlockedEitherWay,
	listBlocked,
	report,
	reports,
	unblock,
} from "./repositories/moderation";
export {
	countUnreadNotifications,
	listNotifications,
	markAllNotificationsRead,
	markNotificationRead,
	notifications,
	notify,
} from "./repositories/notifications";
export {
	addPhoto,
	findProfilePhoto,
	hasProfilePhoto,
	listPhotos,
	photos,
	removePhoto,
	reorderPhotos,
	setProfilePhoto,
} from "./repositories/photos";
export {
	listViewers,
	listVisitHistory,
	profileViews,
	recordView,
} from "./repositories/profileViews";
export {
	findPopularity,
	listVisibleReviews,
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
	findUserByEmail,
	findUserByUsername,
	isEmailTaken,
	isUsernameTaken,
	markUserVerified,
	refreshProfileCompletion,
	setLocation,
	setPresence,
	updatePassword,
	users,
} from "./repositories/users";
export { purgeIfDue } from "./maintenance";
export { applySchema, dropSchema, SCHEMA_VERSION } from "./schema/apply";
export { TAG_LABELS } from "./schema/tags";
export * from "./types";
