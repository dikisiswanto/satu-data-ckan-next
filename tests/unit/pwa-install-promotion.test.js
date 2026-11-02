import { describe, expect, it } from "vitest";
import {
  PWA_PROMOTION_DISMISS_MS,
  PWA_PROMOTION_MIN_PAGE_VIEWS,
  PWA_PROMOTION_MIN_VISITS,
  PWA_PROMOTION_OFFERED_KEY,
  PWA_PROMOTION_PAGES_KEY,
  PWA_PROMOTION_STORAGE_KEY,
  PWA_PROMOTION_VISIT_KEY,
  canPromotePwaInstall,
  classifyPwaInstallPlatform,
  getPwaInstallInstructions,
  isPwaPromotionEngaged,
  isPwaStandalone,
  markPwaInstalled,
  normalizePwaPromotionState,
  readPwaPromotionState,
  recordPwaPromotionEngagement,
  snoozePwaPromotion,
} from "@/lib/pwa-install-promotion";

function createStorage() {
  const values = new Map();
  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
    removeItem(key) {
      values.delete(key);
    },
  };
}

describe("PWA install promotion engagement and preferences", () => {
  it("requires a second visit and at least three public page views", () => {
    expect(PWA_PROMOTION_MIN_VISITS).toBe(2);
    expect(PWA_PROMOTION_MIN_PAGE_VIEWS).toBe(3);
    expect(isPwaPromotionEngaged({ visitCount: 1, pageViews: 8 })).toBe(false);
    expect(isPwaPromotionEngaged({ visitCount: 2, pageViews: 2 })).toBe(false);
    expect(isPwaPromotionEngaged({ visitCount: 2, pageViews: 3 })).toBe(true);
  });

  it("counts visits once per tab session and unique page paths within that session", () => {
    const local = createStorage();
    const session = createStorage();

    let state = recordPwaPromotionEngagement(local, session, "/");
    expect(state).toMatchObject({ visitCount: 1, pageViews: 1 });
    state = recordPwaPromotionEngagement(local, session, "/dataset");
    expect(state).toMatchObject({ visitCount: 1, pageViews: 2 });
    state = recordPwaPromotionEngagement(local, session, "/dataset");
    expect(state).toMatchObject({ visitCount: 1, pageViews: 2 });
    state = recordPwaPromotionEngagement(local, session, "/organisasi");
    expect(state).toMatchObject({ visitCount: 1, pageViews: 3 });

    const secondTab = createStorage();
    state = recordPwaPromotionEngagement(local, secondTab, "/");
    expect(state).toMatchObject({ visitCount: 2, pageViews: 4 });
    expect(session.getItem(PWA_PROMOTION_VISIT_KEY)).toBe("1");
    expect(session.getItem(PWA_PROMOTION_PAGES_KEY)).toContain("/dataset");
  });

  it("normalizes malformed stored data and tolerates blocked storage", () => {
    expect(
      normalizePwaPromotionState({ visitCount: -1, pageViews: "bad" }),
    ).toEqual({
      visitCount: 0,
      pageViews: 0,
      dismissedUntil: 0,
      installed: false,
    });
    expect(readPwaPromotionState({ getItem: () => "not-json" })).toMatchObject({
      visitCount: 0,
      pageViews: 0,
    });
    expect(
      recordPwaPromotionEngagement(
        {
          getItem: () => {
            throw new Error("blocked");
          },
          setItem: () => {
            throw new Error("blocked");
          },
        },
        {
          getItem: () => {
            throw new Error("blocked");
          },
          setItem: () => {
            throw new Error("blocked");
          },
        },
        "/dataset",
      ),
    ).toMatchObject({ visitCount: 1, pageViews: 1 });
  });

  it("snoozes manual dismissal and permanently marks an installed app", () => {
    const storage = createStorage();
    const dismissed = snoozePwaPromotion(
      storage,
      1000,
      PWA_PROMOTION_DISMISS_MS,
    );
    expect(dismissed.dismissedUntil).toBe(1000 + PWA_PROMOTION_DISMISS_MS);
    expect(storage.getItem(PWA_PROMOTION_STORAGE_KEY)).toContain(
      "dismissedUntil",
    );

    const installed = markPwaInstalled(storage);
    expect(installed.installed).toBe(true);
    expect(installed.dismissedUntil).toBe(Number.MAX_SAFE_INTEGER);
  });

  it("uses a per-session offer key without storing browsing history outside the browser", () => {
    expect(PWA_PROMOTION_OFFERED_KEY).toContain("offered");
  });
});

describe("PWA installation platform support", () => {
  it("detects iPhone, iPadOS, Android, Chromium desktop, and current Safari for macOS", () => {
    expect(
      classifyPwaInstallPlatform({
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
      }),
    ).toBe("ios");
    expect(
      classifyPwaInstallPlatform({
        userAgent:
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 Safari/605.1.15",
        maxTouchPoints: 5,
      }),
    ).toBe("ios");
    expect(
      classifyPwaInstallPlatform({
        userAgent: "Mozilla/5.0 (Linux; Android 14) Chrome/130.0",
      }),
    ).toBe("android");
    expect(
      classifyPwaInstallPlatform({
        userAgent: "Mozilla/5.0 (Windows NT 10.0) Chrome/130.0.0.0",
      }),
    ).toBe("chromium-desktop");
    expect(
      classifyPwaInstallPlatform({
        userAgent:
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) Version/17.0 Safari/605.1.15",
      }),
    ).toBe("mac-safari");
  });

  it("does not promote unsupported browsers unless the native prompt is available", () => {
    expect(canPromotePwaInstall({ platform: "unsupported" })).toBe(false);
    expect(
      canPromotePwaInstall({ platform: "unsupported", hasNativePrompt: true }),
    ).toBe(true);
    expect(canPromotePwaInstall({ platform: "ios" })).toBe(true);
  });

  it("provides platform-specific instructions without inventing an install prompt on iOS", () => {
    expect(getPwaInstallInstructions("ios")).toContain(
      "Pilih Tambahkan ke Layar Utama.",
    );
    expect(getPwaInstallInstructions("android")).toContain(
      "Pilih Install app atau Tambahkan ke layar utama.",
    );
    expect(getPwaInstallInstructions("chromium-desktop")).toContain(
      "Pilih ikon Install pada bilah alamat jika tersedia.",
    );
    expect(getPwaInstallInstructions("mac-safari")).toContain(
      "Pilih Add to Dock atau Tambahkan ke Dock.",
    );
    expect(getPwaInstallInstructions("unsupported")).toEqual([]);
  });

  it("detects standalone mode from display mode, iOS Safari state, or Android app referrer", () => {
    expect(isPwaStandalone({ displayMode: true })).toBe(true);
    expect(isPwaStandalone({ navigatorStandalone: true })).toBe(true);
    expect(isPwaStandalone({ referrer: "android-app://com.example" })).toBe(
      true,
    );
    expect(isPwaStandalone({})).toBe(false);
  });
});
