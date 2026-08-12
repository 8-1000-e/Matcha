import type { Metadata } from "next";
import {
	LinkExpiredPage,
	type ExpiredLinkKind,
} from "@/views/LinkExpired/LinkExpiredPage";

export const metadata: Metadata = {
	title: "Lien expiré",
	description: "Ce lien n’est plus valable, demandez-en un nouveau.",
};

function readKind(value: string | string[] | undefined) {
	const kinds: ExpiredLinkKind[] = ["verification", "reset"];
	return kinds.find((kind) => kind === value);
}

export default async function Page({ searchParams }: PageProps<"/link-expired">) {
	const { type } = await searchParams;
	return <LinkExpiredPage kind={readKind(type)} />;
}
