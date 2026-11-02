export const PWA_PROMOTION_STORAGE_KEY = "wajo:pwa-install-promotion:v1";
export const PWA_PROMOTION_VISIT_KEY = "wajo:pwa-install-promotion:visit";
export const PWA_PROMOTION_PAGES_KEY = "wajo:pwa-install-promotion:pages";
export const PWA_PROMOTION_OFFERED_KEY = "wajo:pwa-install-promotion:offered";
export const PWA_PROMOTION_MIN_VISITS = 2;
export const PWA_PROMOTION_MIN_PAGE_VIEWS = 3;
export const PWA_PROMOTION_DISMISS_MS = 14 * 24 * 60 * 60 * 1000;
export const PWA_PROMOTION_PROMPT_DISMISS_MS = 30 * 24 * 60 * 60 * 1000;

const DEFAULT_STATE = Object.freeze({
  visitCount: 0,
  pageViews: 0,
  dismissedUntil: 0,
  installed: false,
});

function safeInteger(value, fallback = 0) {
  const number = Number(value);
  return Number.isSafeInteger(number) && number >= 0 ? number : fallback;
}

export function normalizePwaPromotionState(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ...DEFAULT_STATE };
  }
  return {
    visitCount: safeInteger(value.visitCount),
    pageViews: safeInteger(value.pageViews),
    dismissedUntil: safeInteger(value.dismissedUntil),
    installed: value.installed === true,
  };
}

export function readPwaPromotionState(storage) {
  try {
    const raw = storage?.getItem(PWA_PROMOTION_STORAGE_KEY);
    return raw
      ? normalizePwaPromotionState(JSON.parse(raw))
      : { ...DEFAULT_STATE };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

export function writePwaPromotionState(storage, state) {
  const normalized = normalizePwaPromotionState(state);
  try {
    storage?.setItem(PWA_PROMOTION_STORAGE_KEY, JSON.stringify(normalized));
  } catch {
    // Storage can be unavailable in private browsing or restricted contexts.
  }
  return normalized;
}

/** Count one visit per tab session and one view per unique public path in that session. */
export function recordPwaPromotionEngagement(storage, session, pathname) {
  const state = readPwaPromotionState(storage);
  if (typeof pathname !== "string" || !pathname.startsWith("/")) return state;

  let visitRecorded = false;
  let seenPaths = [];
  try {
    visitRecorded = session?.getItem(PWA_PROMOTION_VISIT_KEY) === "1";
    const rawPaths = session?.getItem(PWA_PROMOTION_PAGES_KEY);
    const parsed = rawPaths ? JSON.parse(rawPaths) : [];
    seenPaths = Array.isArray(parsed)
      ? parsed.filter(
          (path) => typeof path === "string" && path.startsWith("/"),
        )
      : [];
  } catch {
    // Continue with an in-memory count when session storage is unavailable.
  }

  if (!visitRecorded) {
    state.visitCount += 1;
    try {
      session?.setItem(PWA_PROMOTION_VISIT_KEY, "1");
    } catch {
      // Ignore blocked session storage.
    }
  }

  if (!seenPaths.includes(pathname)) {
    state.pageViews += 1;
    seenPaths.push(pathname);
    try {
      session?.setItem(
        PWA_PROMOTION_PAGES_KEY,
        JSON.stringify(seenPaths.slice(-40)),
      );
    } catch {
      // Ignore blocked session storage.
    }
  }

  return writePwaPromotionState(storage, state);
}

export function isPwaPromotionEngaged(state) {
  const normalized = normalizePwaPromotionState(state);
  return (
    normalized.visitCount >= PWA_PROMOTION_MIN_VISITS &&
    normalized.pageViews >= PWA_PROMOTION_MIN_PAGE_VIEWS
  );
}

export function classifyPwaInstallPlatform({
  userAgent = "",
  maxTouchPoints = 0,
} = {}) {
  const ua = String(userAgent);
  const isAppleMobile =
    /iPad|iPhone|iPod/i.test(ua) ||
    (/Macintosh/i.test(ua) && Number(maxTouchPoints) > 1);
  if (isAppleMobile) return "ios";

  if (/Android/i.test(ua)) return "android";

  if (/Edg\//i.test(ua) || /Chrome\//i.test(ua) || /Chromium\//i.test(ua)) {
    return "chromium-desktop";
  }

  if (/Macintosh|Mac OS X/i.test(ua) && /Safari\//i.test(ua)) {
    const safariVersion = Number(ua.match(/Version\/(\d+)/i)?.[1] || 0);
    return safariVersion >= 17 ? "mac-safari" : "unsupported";
  }

  return "unsupported";
}

export function isPwaStandalone({
  displayMode = false,
  navigatorStandalone = false,
  referrer = "",
} = {}) {
  return (
    displayMode ||
    navigatorStandalone === true ||
    String(referrer).startsWith("android-app://")
  );
}

export function canPromotePwaInstall({ platform, hasNativePrompt = false }) {
  return (
    hasNativePrompt ||
    ["ios", "android", "chromium-desktop", "mac-safari"].includes(platform)
  );
}

export function getPwaInstallInstructions(platform) {
  if (platform === "ios") {
    return [
      "Buka menu Bagikan pada browser.",
      "Pilih Tambahkan ke Layar Utama.",
      "Aktifkan Buka sebagai App Web jika tersedia, lalu ketuk Tambah.",
    ];
  }

  if (platform === "android") {
    return [
      "Buka menu browser (ikon tiga titik).",
      "Pilih Install app atau Tambahkan ke layar utama.",
      "Konfirmasi pemasangan pada dialog browser.",
    ];
  }

  if (platform === "mac-safari") {
    return [
      "Buka menu File pada Safari.",
      "Pilih Add to Dock atau Tambahkan ke Dock.",
      "Konfirmasi nama aplikasi, lalu pilih Add.",
    ];
  }

  if (platform === "chromium-desktop") {
    return [
      "Pilih ikon Install pada bilah alamat jika tersedia.",
      "Atau buka menu browser dan pilih Install app / Install this site as an app.",
      "Konfirmasi pemasangan pada dialog browser.",
    ];
  }

  return [];
}

export function snoozePwaPromotion(
  storage,
  now = Date.now(),
  duration = PWA_PROMOTION_DISMISS_MS,
) {
  const state = readPwaPromotionState(storage);
  state.dismissedUntil = safeInteger(now) + safeInteger(duration);
  return writePwaPromotionState(storage, state);
}

export function markPwaInstalled(storage) {
  const state = readPwaPromotionState(storage);
  state.installed = true;
  state.dismissedUntil = Number.MAX_SAFE_INTEGER;
  return writePwaPromotionState(storage, state);
}
