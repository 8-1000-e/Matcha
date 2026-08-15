import { randomInt } from "node:crypto";
import { hashPassword } from "@/lib/auth/password";
import {
	addPhoto,
	createUser,
	execute,
	listTags,
	queryAll,
	refreshProfileCompletion,
	setUserTags,
	sql,
	toFlag,
	transaction,
} from "@/lib/db";
import type { Orientation } from "@/lib/db/types";
import { removePhotoFile } from "@/lib/profile/storage";
import {
	EMAIL_DOMAIN,
	fetchIdentities,
	type Identity,
} from "./seed/identities";
import { storePhotos, type StoredPhoto } from "./seed/photos";
import { pickPlaces, type Place } from "./seed/places";
import { pick } from "./seed/random";
import { seedSocial } from "./seed/social";

const COUNT = 500;
const PASSWORD = "Seed!Matcha42";
const TAGS_PER_USER = { min: 3, max: 8 };
const PHOTOS_PER_USER = { min: 1, max: 4 };
const BIOGRAPHIES: readonly string[] = [
	"Je cuisine beaucoup trop pour une personne seule. Si tu sais quoi faire d’un reste de curry, on devrait se parler.",
	"Lève-tôt du dimanche, couche-tard du vendredi. J’aime les longues marches sans destination et les terrasses au soleil.",
	"Je collectionne les vinyles que je n’écoute jamais et les plantes que j’oublie d’arroser. Personne n’est parfait.",
	"Deux passions : le café et les débats sans intérêt. Je peux défendre pendant une heure que l’ananas a sa place sur une pizza.",
	"Je viens de m’installer dans le coin et je cherche les bonnes adresses. Si tu connais un bon bar à vin, je t’écoute.",
	"Grimpeur du week-end, développeur en semaine. Je préfère largement les blocs aux bugs.",
	"Je lis trois livres en même temps et je n’en finis aucun. Recommande-moi le quatrième.",
	"Fan de rando, de fromage et de mauvaises séries. Souvent les trois le même week-end.",
	"J’ai appris le piano à trente ans. Mes voisins n’ont pas encore porté plainte, c’est bon signe.",
	"Ni sérieux ni pressé. J’aime les gens curieux, les longues discussions et les plans décidés à la dernière minute.",
	"Je cours pour manger, pas l’inverse. Semi-marathon en préparation, tiramisu en récompense.",
	"Photographe amateur, très amateur. Je shoote surtout des chats qui ne m’appartiennent pas.",
	"J’aime les musées vides, les marchés bondés et les gens qui parlent avec les mains.",
	"Je jardine sur un balcon de quatre mètres carrés. C’est une jungle, j’en suis assez fier.",
	"Toujours partant pour un concert, un road trip improvisé ou une soirée jeux de société.",
	"Je crois profondément que le meilleur plan du samedi, c’est de ne pas en avoir.",
	"Cinéphile insupportable, je préviens. Mais je laisse choisir le film au premier rendez-vous.",
	"Prof de maths le jour, batteur médiocre le soir. J’assume les deux.",
	"J’ai vécu dans quatre pays et je cherche une raison de rester dans celui-ci.",
	"Nul en présentation, meilleur en vrai. Propose-moi un café, tu verras bien.",
];



export interface SocialCounts {
	likes: number;
	matches: number;
	views: number;
	reviews: number;
}

async function main(): Promise<void>
{
	const startedAt = Date.now();
	const hashedPassword = await hashPassword(PASSWORD);
	const purged = await purgePreviousSeed();
	const profiles = await buildProfiles();
	const ids = insertProfiles(profiles, hashedPassword);
	const stats = seedSocial(ids);

	report(profiles, ids.length, purged, stats, Date.now() - startedAt);
}

function report(
	profiles: readonly SeedProfile[],
	created: number,
	purged: number,
	stats: SocialCounts,
	elapsedMs: number,
): void
{
	const photos = profiles.reduce((total, one) => total + one.photos.length, 0);
	const cities = new Set(profiles.map((one) => one.place.city)).size;
	const line = (label: string, value: number) =>
	{
		console.log(`  ${label.padEnd(16)}${String(value).padStart(8)}`);
	};

	console.log(`\n  seed termine en ${(elapsedMs / 1000).toFixed(1)} s`);
	console.log(`  ${"─".repeat(24)}`);
	line("profils crees", created);
	line("anciens purges", purged);
	line("photos", photos);
	line("villes", cities);
	line("likes", stats.likes);
	line("matchs", stats.matches);
	line("visites", stats.views);
	line("avis", stats.reviews);
	console.log(`  ${"─".repeat(24)}`);
	console.log(`  comptes @${EMAIL_DOMAIN}`);
	console.log(`  mot de passe : ${PASSWORD}\n`);
}

async function purgePreviousSeed(): Promise<number>
{
	const pattern = `%@${EMAIL_DOMAIN}`;
	const doomed = queryAll<{ id: string }>(
		sql`SELECT id FROM users WHERE email LIKE ${pattern}`,
	);
	if (doomed.length === 0)
	{
		return 0;
	}

	const files = queryAll<{ path: string }>(sql`
		SELECT path FROM photos
		WHERE user_id IN (SELECT id FROM users WHERE email LIKE ${pattern})
	`);

	execute(sql`DELETE FROM users WHERE email LIKE ${pattern}`);

	for (const file of files)
	{
		await removePhotoFile(file.path);
	}

	return doomed.length;
}

interface SeedProfile {
	identity: Identity;
	place: Place;
	photos: StoredPhoto[];
	orientation: Orientation;
	biography: string;
	tagIds: number[];
}

async function buildProfiles(): Promise<SeedProfile[]>
{
	const identities = await fetchIdentities(COUNT);
	const places = pickPlaces(COUNT);
	const tagPool = listTags().map((tag) => tag.id);
	const seeds: SeedProfile[] = [];

	for (const [index, identity] of identities.entries())
	{
		const wanted = between(PHOTOS_PER_USER.min, PHOTOS_PER_USER.max);
		const urls = Array.from(
			{ length: wanted },
			(_, slot) => `${identity.picture}-${slot}`,
		);

		seeds.push({
			identity,
			place: places[index],
			photos: await storePhotos(urls),
			orientation: pickOrientation(),
			biography: pickBiography(),
			tagIds: pickTagIds(tagPool),
		});

		if ((index + 1) % 50 === 0)
		{
			console.log(`  ${index + 1}/${COUNT} profils prepares`);
		}
	}

	return seeds;
}

function insertProfiles(
	profiles: readonly SeedProfile[],
	passwordHash: string,
): string[]
{
	return transaction(() =>
	{
		const ids: string[] = [];

		for (const profile of profiles)
		{
			const user = createUser({
				email: profile.identity.email,
				username: profile.identity.username,
				first_name: profile.identity.first_name,
				last_name: profile.identity.last_name,
				password_hash: passwordHash,
				birth_date: profile.identity.birth_date,
				gender: profile.identity.gender,
				orientation: profile.orientation,
				biography: profile.biography,
				is_verified: 1,
				latitude: profile.place.latitude,
				longitude: profile.place.longitude,
				city: profile.place.city,
				neighborhood: profile.place.neighborhood,
				location_consent: toFlag(profile.place.location_consent),
			});

			setUserTags(user.id, profile.tagIds);
			for (const photo of profile.photos)
			{
				addPhoto(user.id, photo.path);
			}
			refreshProfileCompletion(user.id);
			ids.push(user.id);
		}

		return ids;
	});
}

function pickTagIds(available: readonly number[]): number[]
{
	const wanted = Math.min(
		between(TAGS_PER_USER.min, TAGS_PER_USER.max),
		available.length,
	);
	const taken = new Set<number>();

	while (taken.size < wanted)
	{
		taken.add(available[between(0, available.length - 1)]);
	}

	return [...taken];
}

function pickOrientation(): Orientation
{
	const odds = randomInt(100);
	if (odds < 70)
	{
		return "hetero";
	}
	if (odds < 85)
	{
		return "bi";
	}
	if (odds < 95)
	{
		return "homo";
	}
	if (odds < 98)
	{
		return "pan";
	}
	return "other";
}

function pickBiography(): string
{
	return pick(BIOGRAPHIES);
}

function between(min: number, max: number): number
{
	return (randomInt(min, max + 1));
}

main().catch((error: Error) =>
{
	console.error(error.message);
	process.exit(1);
});
