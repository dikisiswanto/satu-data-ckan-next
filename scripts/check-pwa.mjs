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
const publicLayout = read("src/components/public-layout.jsx");
const rootLayout = read("src/app/layout.jsx");
const promotion = read("src/components/pwa-install-promotion.jsx");
const promotionLogic = read("src/lib/pwa-install-promotion.js");
const promotionStyles = read("src/app/styles/pwa-install-promotion.css");
const promotionUnitTests = read("tests/unit/pwa-install-promotion.test.js");
const promotionE2eTests = read("tests/e2e/public-performance.spec.js");

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
  "public/icons/icon.svg",
  "public/icons/portal.svg",
  "src/app/favicon.ico",
  "src/app/icon.png",
  "src/app/apple-icon.png",
]) {
  check(
    fs.existsSync(path.join(root, relativePath)),
    `Required PWA asset missing: ${relativePath}`,
  );
}
for (const [relativePath, expectedSize] of [
  ["public/icons/icon-192.png", 192],
  ["public/icons/icon-512.png", 512],
  ["src/app/icon.png", 64],
  ["src/app/apple-icon.png", 180],
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

const favicon = fs.readFileSync(path.join(root, "src/app/favicon.ico"));
check(
  favicon.length > 22 &&
    favicon.readUInt16LE(0) === 0 &&
    favicon.readUInt16LE(2) === 1,
  "Browser favicon must be a valid ICO file.",
);
check(
  /url: "\/favicon\.ico"/.test(layout) &&
    /shortcut: "\/favicon\.ico"/.test(layout),
  "Browser tab and shortcut icons must retain a local favicon fallback.",
);
check(
  /apple: \[\{ url: "\/apple-icon\.png", sizes: "180x180", type: "image\/png" \}\]/.test(
    layout,
  ),
  "Apple touch icon must point to the local 180x180 PNG asset.",
);
check(
  /NEXT_PUBLIC_ICON_PATH \|\| "\/icons\/icon\.svg"/.test(siteConfig) &&
    /NEXT_PUBLIC_LOGO_PATH \|\| "\/icons\/portal\.svg"/.test(siteConfig) &&
    /NEXT_PUBLIC_PWA_ICON_192 \|\| "\/icons\/icon-192\.png"/.test(siteConfig) &&
    /NEXT_PUBLIC_PWA_ICON_512 \|\| "\/icons\/icon-512\.png"/.test(siteConfig),
  "Default browser and PWA icon paths must resolve to committed local assets.",
);
const browserIconSvg = read("public/icons/icon.svg");
const brandLogoSvg = read("public/icons/portal.svg");
check(
  /<svg\b[^>]*viewBox="0 0 64 64"/.test(browserIconSvg) &&
    /<path\b/.test(browserIconSvg),
  "Default browser SVG icon must be a complete 64x64 vector asset.",
);
check(
  /<svg\b[^>]*viewBox="0 0 64 64"/.test(brandLogoSvg) &&
    /<path\b/.test(brandLogoSvg),
  "Default portal logo must remain a complete 64x64 vector asset.",
);
check(
  /portal-satu-data-static-v6/.test(worker) &&
    /portal-satu-data-static-v6/.test(promotionE2eTests),
  "PWA runtime tests and service worker cache version must stay synchronized.",
);

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
  /portal-satu-data-static-v6/.test(worker),
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
  /PUBLIC_IMAGE_ASSETS/.test(worker) &&
    /PUBLIC_IMAGE_EXTENSION/.test(worker) &&
    /stale-while-revalidate/i.test(worker),
  "Same-origin public image assets, including tenant-configured logos, should use bounded stale-while-revalidate caching.",
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

check(
  /PwaInstallPromotion/.test(publicLayout) &&
    !/PwaInstallPromotion/.test(rootLayout),
  "PWA install promotion must mount only inside the public layout, never in the shared root/admin shell.",
);
check(
  /useSyncExternalStore/.test(promotion) &&
    /publishPwaSnapshot/.test(promotion) &&
    !/set(?:Platform|Engagement|Visible)\(/.test(promotion),
  "PWA browser state must use an external-store subscription instead of synchronous state setters in effects.",
);
check(
  /beforeinstallprompt/.test(promotion) && /appinstalled/.test(promotion),
  "PWA promotion must use native install lifecycle events when the browser supports them.",
);
check(
  /event\.preventDefault\(\)/.test(promotion) &&
    /promptEvent\.prompt\(\)/.test(promotion),
  "The deferred native install prompt must only be invoked from the user's install action.",
);
check(
  /PWA_PROMOTION_MIN_VISITS\s*=\s*2/.test(promotionLogic) &&
    /PWA_PROMOTION_MIN_PAGE_VIEWS\s*=\s*3/.test(promotionLogic),
  "PWA install promotion must wait for a second visit and at least three public page views.",
);
check(
  /PWA_PROMOTION_DISMISS_MS\s*=\s*14/.test(promotionLogic) &&
    /PWA_PROMOTION_PROMPT_DISMISS_MS\s*=\s*30/.test(promotionLogic),
  "Manual and native-prompt dismissals must be snoozed for their configured intervals.",
);
check(
  /classifyPwaInstallPlatform/.test(promotionLogic) &&
    /getPwaInstallInstructions/.test(promotionLogic) &&
    /Tambahkan ke Layar Utama/.test(promotionLogic),
  "PWA promotion must provide platform-aware manual install instructions, including iOS.",
);
check(
  /displayMode/.test(promotionLogic) &&
    /navigatorStandalone/.test(promotionLogic) &&
    /markPwaInstalled/.test(promotion),
  "PWA promotion must stop when the app is already installed or running standalone.",
);
check(
  /focusin/.test(promotion) &&
    /a\[download\]/.test(promotion) &&
    /a\[target=\'_blank\']/.test(promotion) &&
    /form/.test(promotion),
  "PWA promotion must get out of the way during form entry and download interactions.",
);
check(
  /safe-area-inset-bottom/.test(promotionStyles) &&
    /prefers-reduced-motion/.test(promotionStyles) &&
    /max-height/.test(promotionStyles),
  "PWA promotion must respect mobile safe areas, reduced motion, and small viewports.",
);
check(
  /PWA install promotion waits for engagement/.test(promotionE2eTests) &&
    /already installed/.test(promotionE2eTests) &&
    /counts visits once per tab session/.test(promotionUnitTests),
  "PWA promotion must have engagement, installed-state, and browser-storage regression tests.",
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
  "PWA checks passed: install metadata, safe cache boundaries, public-only soft install promotion, engagement/dismissal lifecycle, platform instructions, and responsive install UI.\n",
);
