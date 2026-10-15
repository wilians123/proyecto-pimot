import fs from "node:fs";
import path from "node:path";

const ALLOWLIST = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
];

function loadAllowlistedEnvironment() {
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

function roleIsValid(value, expectedRole, acceptedPrefix) {
  if (!value) return false;
  if (value.startsWith(acceptedPrefix)) return true;

  const parts = value.split(".");
  if (parts.length !== 3) return false;
  try {
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
    return payload.role === expectedRole;
  } catch {
    return false;
  }
}

loadAllowlistedEnvironment();

let valid = true;
for (const name of ALLOWLIST) {
  const present = Boolean(process.env[name]?.trim());
  console.log(`${name}: ${present ? "PRESENTE" : "AUSENTE"}`);
  if (!present) valid = false;
}

const urlValue = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
const urlMatch = /^https:\/\/([a-z0-9-]+\.supabase\.co)\/?$/i.exec(urlValue);
if (urlMatch) {
  console.log("URL del proyecto: OK");
  console.log(`BD objetivo: ${urlMatch[1].toLowerCase()}`);
} else {
  console.log("URL del proyecto: INTERCAMBIADA/INVÁLIDA");
  valid = false;
}

const serviceRoleOk = roleIsValid(
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  "service_role",
  "sb_secret_",
);
console.log(`SUPABASE_SERVICE_ROLE_KEY: ${serviceRoleOk ? "OK" : "INTERCAMBIADA/INVÁLIDA"}`);
if (!serviceRoleOk) valid = false;

const anonOk = roleIsValid(
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  "anon",
  "sb_publishable_",
);
console.log(`NEXT_PUBLIC_SUPABASE_ANON_KEY: ${anonOk ? "OK" : "INTERCAMBIADA/INVÁLIDA"}`);
if (!anonOk) valid = false;

console.log(
  "Antes de ejecutar las pruebas confirma que el Database Webhook de la tabla alertas NO está configurado y que no hay otras sesiones de la app abiertas.",
);
if (!valid) process.exitCode = 1;
