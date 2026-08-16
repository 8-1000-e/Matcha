import type { Metadata } from "next";
import { requirePrivateUser } from "@/lib/auth/serverUser";
import { users } from "@/lib/db";
import { MapPage } from "@/views/Map/MapPage";

export const metadata: Metadata = {
	title: "Carte",
	description: "Les profils qui vous correspondent, sur une carte.",
};

export default async function Page() {
	const session = await requirePrivateUser();
	const me = users.findById(session.id);

	const centre = me?.latitude === null || me?.longitude === null || me === undefined
		? null
		: { latitude: me.latitude, longitude: me.longitude };

	return <MapPage centre={centre} />;
}
