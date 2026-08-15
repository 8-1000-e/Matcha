const FALLBACK_STUN = ["stun:stun.l.google.com:19302"];

export interface IceServer {
	urls: string[];
	username?: string;
	credential?: string;
}

function list(raw: string | undefined): string[] {
	return (raw ?? "")
		.split(",")
		.map((entry) => entry.trim())
		.filter((entry) => entry.length > 0);
}

export function iceServers(): IceServer[] {
	const stun = list(process.env.STUN_URLS);
	const turn = list(process.env.TURN_URLS);
	const username = process.env.TURN_USERNAME ?? "";
	const credential = process.env.TURN_CREDENTIAL ?? "";

	const servers: IceServer[] = [
		{ urls: stun.length > 0 ? stun : FALLBACK_STUN },
	];
	if (turn.length > 0 && username.length > 0 && credential.length > 0) {
		servers.push({ urls: turn, username, credential });
	}
	return servers;
}
