import { randomInt } from "crypto";
import { like, recordView, upsertReview } from "@/lib/db";
import { pick } from "./random";

const LIKES_PER_USER = { min: 2, max: 25 };
const VIEWS_PER_USER = { min: 5, max: 40 };
const REVIEW_RATIO = 0.3;
const REVIEW_BODIES: readonly string[] = [
	"Discussion très agréable, quelqu’un de fiable.",
	"Sympa et drôle, je recommande.",
	"Rendez-vous sympathique, rien à redire.",
	"Correct et respectueux du début à la fin.",
	"Bon contact, on a beaucoup ri.",
];

type Pair = [string, string];

export interface SocialCounts {
	likes: number;
	matches: number;
	views: number;
	reviews: number;
}

export function seedSocial(userIds: readonly string[]): SocialCounts
{
	const { likes, matched } = seedLikes(userIds);
	const views = seedViews(userIds);
	const reviews = seedReviews(matched);

	return { likes, matches: matched.length, views, reviews };
}

function seedLikes(
	userIds: readonly string[],
): { likes: number; matched: Pair[] }
{
	let likes = 0;
	const matched: Pair[] = [];

	for (const liker of userIds)
	{
		const count = between(LIKES_PER_USER.min, LIKES_PER_USER.max);
		for (const liked of pickTargets(userIds, liker, count))
		{
			const outcome = like(liker, liked);
			if (outcome.liked)
			{
				likes += 1;
			}
			if (outcome.matched)
			{
				matched.push([liker, liked]);
			}
		}
	}

	return { likes, matched };
}

function seedViews(userIds: readonly string[]): number
{
	let views = 0;

	for (const viewer of userIds)
	{
		const count = between(VIEWS_PER_USER.min, VIEWS_PER_USER.max);
		for (const viewed of pickTargets(userIds, viewer, count))
		{
			recordView(viewer, viewed);
			views += 1;
		}
	}

	return views;
}

function seedReviews(matched: readonly Pair[]): number
{
	let reviews = 0;

	for (const [first, second] of matched)
	{
		for (const [author, target] of [[first, second], [second, first]] as Pair[])
		{
			if (Math.random() >= REVIEW_RATIO)
			{
				continue;
			}

			upsertReview({
				author_id: author,
				target_id: target,
				score: between(3, 5),
				body: pick(REVIEW_BODIES),
			});
			reviews += 1;
		}
	}

	return reviews;
}

function pickTargets(
	userIds: readonly string[],
	self: string,
	count: number,
): string[]
{
	const pool = userIds.filter((id) => id !== self);
	const wanted = Math.min(count, pool.length);
	const taken = new Set<number>();

	while (taken.size < wanted)
	{
		taken.add(between(0, pool.length - 1));
	}

	return [...taken].map((index) => pool[index]);
}

function between(min: number, max: number): number
{
	return (randomInt(min, max + 1));
}
