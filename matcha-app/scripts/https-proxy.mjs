import { readFileSync } from "node:fs";
import { request } from "node:http";
import { createServer } from "node:https";
import { connect } from "node:net";
import { networkInterfaces } from "node:os";

const HTTPS_PORT = Number(process.env.HTTPS_PORT ?? 3001);
const TARGET_PORT = Number(process.env.PORT ?? 3000);
const KEY = process.env.HTTPS_KEY ?? "./certificates/dev-key.pem";
const CERT = process.env.HTTPS_CERT ?? "./certificates/dev.pem";

let credentials;
try {
	credentials = { key: readFileSync(KEY), cert: readFileSync(CERT) };
} catch {
	console.error(
		`Certificat introuvable (${CERT}).\n`
		+ "Generez-le avec :\n"
		+ "  mkdir -p certificates && cd certificates\n"
		+ "  mkcert -cert-file dev.pem -key-file dev-key.pem localhost 127.0.0.1 ::1 <votre-ip>",
	);
	process.exit(1);
}

function addresses() {
	return Object.values(networkInterfaces())
		.flat()
		.filter((entry) => entry && entry.family === "IPv4" && !entry.internal)
		.map((entry) => entry.address);
}

const server = createServer(credentials, (incoming, outgoing) => {
	const proxied = request(
		{
			host: "127.0.0.1",
			port: TARGET_PORT,
			path: incoming.url,
			method: incoming.method,
			headers: { ...incoming.headers, "x-forwarded-proto": "https" },
		},
		(response) => {
			outgoing.writeHead(response.statusCode ?? 502, response.headers);
			response.pipe(outgoing);
		},
	);

	proxied.on("error", () => {
		outgoing.writeHead(502, { "content-type": "text/plain" });
		outgoing.end(`Aucun serveur sur http://127.0.0.1:${TARGET_PORT}`);
	});

	incoming.pipe(proxied);
});

server.on("upgrade", (incoming, socket, head) => {
	const upstream = connect(TARGET_PORT, "127.0.0.1", () => {
		const lines = Object.entries(incoming.headers).map(
			([name, value]) => `${name}: ${value}\r\n`,
		);
		upstream.write(
			`${incoming.method} ${incoming.url} HTTP/1.1\r\n${lines.join("")}\r\n`,
		);
		upstream.write(head);
		upstream.pipe(socket);
		socket.pipe(upstream);
	});
	upstream.on("error", () => socket.destroy());
	socket.on("error", () => upstream.destroy());
});

server.listen(HTTPS_PORT, "0.0.0.0", () => {
	console.log(`  proxy HTTPS  -> http://127.0.0.1:${TARGET_PORT}`);
	console.log(`  Local:         https://localhost:${HTTPS_PORT}`);
	for (const address of addresses()) {
		console.log(`  Network:       https://${address}:${HTTPS_PORT}`);
	}
});
