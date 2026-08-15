let openLink: string | null = null;

export function openConversation(link: string): () => void {
	openLink = link;
	return () => {
		if (openLink === link) {
			openLink = null;
		}
	};
}

export function isConversationOpen(link: string | null): boolean {
	return link !== null && link === openLink;
}
