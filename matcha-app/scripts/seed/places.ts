import {randomInt} from "node:crypto";
import { queryAll } from "@/lib/db/core/client";
import { sql } from "@/lib/db/core/sql";

const JITTER_DEGREES = 0.05;
const CITY_POOL = 50;
const MINIMUM_POP = 20000;

interface CityPick {
	name: string;
	country: string;
	latitude: number;
	longitude: number;
}

export interface Place {
	city: string;
	neighborhood: string | null;
	latitude: number;
	longitude: number;
	location_consent: boolean;
}

export function pickPlaces(count: number): Place[]
{
	const cities = drawCities(CITY_POOL);
	const places: Place[] = [];
	
	while (places.length < count)
	{
		const city = cities[randomInt(cities.length)];
		places.push({city: city.name, neighborhood: null, latitude: jitter(city.latitude), longitude: jitter(city.longitude), location_consent: false});
	}
	return places
}

function drawCities(size: number): CityPick[]
{
	const cities = queryAll<CityPick>(sql`
		SELECT name, country, latitude, longitude
		FROM cities
		WHERE population >= ${MINIMUM_POP}
		ORDER BY RANDOM()
		LIMIT ${size}
	`);

	if (cities.length === 0)
	{
		throw new Error(
			`aucune ville de plus de ${MINIMUM_POP} habitants en base.`
			+ ` Lancez "npm run db:seed:cities", et verifiez que DATABASE_PATH`
			+ ` est bien charge (option --env-file-if-exists=.env).`,
		);
	}

	return cities;
}

function jitter(value: number): number
{
	const offset = (Math.random() * 2 - 1) * JITTER_DEGREES;
	return Number((value + offset).toFixed(5));
}
