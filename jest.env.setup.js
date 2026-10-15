// Jest loads this setup as CommonJS before the test modules.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require("node:fs");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require("node:path");

const ALLOWLIST = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
];

if (process.env.GEOFENCE_IT === "1") {
  const allowed = new Set(ALLOWLIST);
  for (const filename of [".env.local", ".env"]) {
    const filepath = path.join(process.cwd(), filename);
    if (!fs.existsSync(filepath)) continue;

    let contents;
    try {
      contents = fs.readFileSync(filepath, "utf8");
    } catch {
      continue;
    }

    if (contents.charCodeAt(0) === 0xfeff) contents = contents.slice(1);
    for (const rawLine of contents.split(/\r?\n/)) {
      let line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      if (line.startsWith("export ")) line = line.slice("export ".length).trim();

      const separator = line.indexOf("=");
      if (separator < 1) continue;
      const name = line.slice(0, separator).trim();
      if (!allowed.has(name) || process.env[name] !== undefined) continue;

      let value = line.slice(separator + 1).trim();
      if (
        value.length >= 2 &&
        ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'")))
      ) {
        value = value.slice(1, -1);
      }
      process.env[name] = value;
    }
  }
}
