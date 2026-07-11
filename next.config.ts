import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Evita que Next.js intente empaquetar estos paquetes nativos/de servidor
  // en su bundle. Sin esto, baileys/better-sqlite3/pino rompen el build.
  serverExternalPackages: [
    "@whiskeysockets/baileys",
    "better-sqlite3",
    "pino",
  ],
};

export default nextConfig;
