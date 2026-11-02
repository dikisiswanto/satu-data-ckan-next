#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (relativePath) =>
  fs.readFileSync(path.join(root, relativePath), "utf8");
const errors = [];
const check = (condition, message) => {
  if (!condition) errors.push(message);
};

const layout = read("src/app/layout.jsx");
const manifest = read("src/app/manifest.js");
const siteConfig = read("src/lib/site-config.js");
const registration = read("src/components/service-worker-registration.jsx");
const worker = read("public/sw.js");
const home = read("src/app/(public)/page.jsx");

check(
  /manifest:\s*"\/manifest\.webmanifest"/.test(layout),
  "Root metadata must link the PWA manifest.",
);
check(
  /export const viewport\s*=/.test(layout),
  "Root layout must expose browser theme metadata.",
);
check(
  /themeColor:\s*siteConfig\.themeColor/.test(layout),
  "Browser chrome and PWA manifest must share the configured theme color.",
);
check(
  /background_color:\s*siteConfig\.backgroundColor/.test(manifest),
  "Manifest background color must use shared site configuration.",
);
check(
  /theme_color:\s*siteConfig\.themeColor/.test(manifest),
  "Manifest theme color must use shared site configuration.",
);
check(
  /themeColor:\s*process\.env\.NEXT_PUBLIC_THEME_COLOR/.test(siteConfig),
  "PWA theme color must remain environment-configurable.",
);
check(
  /display:\s*"standalone"/.test(manifest),
  "Manifest must support standalone installation.",
);
check(
  /scope:\s*"\/"/.test(manifest) && /start_url:\s*"\/"/.test(manifest),
  "Manifest start URL and scope must cover the portal root.",
);

for (const relativePath of [
  "public/offline.html",
  "public/sw.js",
  "public/icons/icon-192.png",
  "public/icons/icon-512.png",
]) {
  check(
    fs.existsSync(path.join(root, relativePath)),
    `Required PWA asset missing: ${relativePath}`,
  );
}
for (const [relativePath, expectedSize] of [
  ["public/icons/icon-192.png", 192],
  ["public/icons/icon-512.png", 512],
]) {
  try {
    const buffer = fs.readFileSync(path.join(root, relativePath));
    check(
      buffer.readUInt32BE(0) === 0x89504e47,
      `${relativePath} must be a valid PNG.`,
    );
    check(
      buffer.readUInt32BE(16) === expectedSize &&
        buffer.readUInt32BE(20) === expectedSize,
      `${relativePath} must be ${expectedSize}x${expectedSize}.`,
    );
  } catch {
    // The missing-file check above gives the actionable failure.
  }
}

check(
  /if \(process\.env\.NODE_ENV !== "production"\) return/.test(registration),
  "Service worker must remain disabled during development.",
);
check(
  /updateViaCache:\s*"none"/.test(registration),
  "Service worker script updates must not be hidden by HTTP cache.",
);
check(
  !/registration\.update\(\)/.test(registration),
  "Do not force a redundant service-worker update request on every page load.",
);
check(
  /portal-satu-data-static-v5/.test(worker),
  "Service worker cache version must be bumped when the cache policy changes.",
);
check(
  /cache\.addAll\(\[OFFLINE_URL\]\)/.test(worker),
  "Offline fallback must be precached during installation.",
);
check(
  /self\.skipWaiting\(\)/.test(worker) &&
    /self\.clients\.claim\(\)/.test(worker),
  "Service worker must activate promptly and claim existing clients.",
);
check(
  /request\.mode === "navigate"/.test(worker) &&
    /cache\.match\(OFFLINE_URL\)/.test(worker),
  "Offline navigation must use the dedicated fallback document.",
);
check(
  /isImmutableChunk\(url\)/.test(worker) &&
    /requireImmutable:\s*true/.test(worker),
  "Hashed Next.js chunks must be cached only when the server marks them immutable.",
);
check(
  /PUBLIC_IMAGE_ASSETS/.test(worker) && /stale-while-revalidate/i.test(worker),
  "Only the explicit public-image allowlist should use stale-while-revalidate caching.",
);
check(
  /request\.method !== "GET"/.test(worker) &&
    /url\.origin !== self\.location\.origin/.test(worker),
  "Non-GET and cross-origin requests must bypass the service worker cache.",
);
check(
  /Never cache HTML, API responses, authenticated pages, or user-specific data/.test(
    worker,
  ),
  "The service worker must preserve the private/API cache boundary.",
);
check(
  !/\/api\//.test(worker),
  "Service worker must not add API routes to the static asset cache allowlist.",
);

check(
  /<Image[\s\S]*?src=\{siteConfig\.heroImage\}[\s\S]*?fill[\s\S]*?preload/.test(
    home,
  ),
  "Homepage hero image must be server-rendered and preloaded for LCP.",
);
check(
  /sizes="100vw"/.test(home),
  "Homepage hero image must declare responsive image sizes.",
);

if (errors.length) {
  process.stderr.write(
    `PWA checks failed (${errors.length}):\n${errors
      .map((error) => `- ${error}`)
      .join("\n")}\n`,
  );
  process.exit(1);
}
process.stdout.write(
  "PWA checks passed: install metadata, icon dimensions, production registration, offline fallback, safe asset caching, and LCP image preload.\n",
);
