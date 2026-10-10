import type { CapacitorConfig } from "@capacitor/cli";

const url = process.env.CAP_SERVER_URL;
if (!url) throw new Error("Define CAP_SERVER_URL antes de ejecutar cap sync");

const config: CapacitorConfig = {
  appId: "com.pimot.app",
  appName: "PIMOT",
  webDir: "capacitor-www",
  server: { url, androidScheme: "https", cleartext: url.startsWith("http://") },
};

export default config;
