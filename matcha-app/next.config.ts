import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	// Modules natifs : le bundler ne doit pas essayer de les empaqueter,
	// ils doivent rester des require() Node classiques.
	serverExternalPackages: ["better-sqlite3", "bcrypt"],
};

export default nextConfig;
