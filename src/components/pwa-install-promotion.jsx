"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import {
  AppWindow,
  ChevronDown,
  Download,
  MoreHorizontal,
  Share2,
  X,
} from "lucide-react";
import { siteConfig } from "@/lib/site-config";
import {
  PWA_PROMOTION_OFFERED_KEY,
  PWA_PROMOTION_DISMISS_MS,
  PWA_PROMOTION_PROMPT_DISMISS_MS,
  canPromotePwaInstall,
  classifyPwaInstallPlatform,
  getPwaInstallInstructions,
  isPwaPromotionEngaged,
  isPwaStandalone,
  markPwaInstalled,
  readPwaPromotionState,
  recordPwaPromotionEngagement,
  snoozePwaPromotion,
} from "@/lib/pwa-install-promotion";

const SERVER_SNAPSHOT = Object.freeze({
  platform: "unsupported",
  engagement: null,
  installPrompt: null,
  visible: false,
  installed: false,
});

let browserSnapshot = SERVER_SNAPSHOT;
const snapshotListeners = new Set();

function subscribeToPwaSnapshot(listener) {
  snapshotListeners.add(listener);
  return () => snapshotListeners.delete(listener);
}

function getPwaSnapshot() {
  return browserSnapshot;
}

function getServerPwaSnapshot() {
  return SERVER_SNAPSHOT;
}

function publishPwaSnapshot(update) {
  browserSnapshot = Object.freeze({ ...browserSnapshot, ...update });
  snapshotListeners.forEach((listener) => listener());
}

function getBrowserStorage(type) {
  try {
    return window[type];
  } catch {
    return null;
  }
}

function isStandaloneMode() {
  return isPwaStandalone({
    displayMode: window.matchMedia?.("(display-mode: standalone)").matches,
    navigatorStandalone: window.navigator.standalone,
    referrer: document.referrer,
  });
}

function isSensitiveInteraction(target) {
  if (!(target instanceof Element)) return false;
  return Boolean(
    target.closest(
      [
        "input",
        "textarea",
        "select",
        "[contenteditable='true']",
        "form",
        "[data-no-pwa-promo]",
        "a[download]",
        "a[href*='/download']",
        "a[target='_blank']",
        "[data-download]",
        "[role='dialog']",
      ].join(","),
    ),
  );
}

function canOfferPromotion({ engagement, platform, installPrompt }) {
  if (browserSnapshot.visible) return true;
  if (isStandaloneMode()) return false;
  if (!isPwaPromotionEngaged(engagement)) return false;
  if (
    !canPromotePwaInstall({ platform, hasNativePrompt: Boolean(installPrompt) })
  ) {
    return false;
  }

  const localStorage = getBrowserStorage("localStorage");
  const current = readPwaPromotionState(localStorage);
  if (current.installed || current.dismissedUntil > Date.now()) return false;

  const sessionStorage = getBrowserStorage("sessionStorage");
  try {
    if (sessionStorage?.getItem(PWA_PROMOTION_OFFERED_KEY) === "1")
      return false;
    sessionStorage?.setItem(PWA_PROMOTION_OFFERED_KEY, "1");
  } catch {
    // If storage is blocked, the current in-memory snapshot still limits visibility.
  }

  return true;
}

function hidePromotion() {
  publishPwaSnapshot({ visible: false });
}

export function PwaInstallPromotion() {
  const pathname = usePathname();
  const browserState = useSyncExternalStore(
    subscribeToPwaSnapshot,
    getPwaSnapshot,
    getServerPwaSnapshot,
  );
  const [showInstructions, setShowInstructions] = useState(false);
  const [installing, setInstalling] = useState(false);

  const { platform, _engagement, installPrompt, visible } = browserState;
  const instructions = useMemo(
    () => getPwaInstallInstructions(platform),
    [platform],
  );
  const hasNativePrompt = Boolean(installPrompt);

  useEffect(() => {
    const nextPlatform = classifyPwaInstallPlatform({
      userAgent: navigator.userAgent,
      maxTouchPoints: navigator.maxTouchPoints || 0,
    });

    if (isStandaloneMode()) {
      markPwaInstalled(getBrowserStorage("localStorage"));
      publishPwaSnapshot({
        platform: nextPlatform,
        engagement: browserSnapshot.engagement,
        installPrompt: null,
        installed: true,
        visible: false,
      });
    } else {
      publishPwaSnapshot({ platform: nextPlatform });
    }

    const handleBeforeInstallPrompt = (event) => {
      // Keep the browser prompt for a user-initiated button after meaningful engagement.
      event.preventDefault();
      const shouldShow = canOfferPromotion({
        engagement: browserSnapshot.engagement,
        platform: browserSnapshot.platform,
        installPrompt: event,
      });
      publishPwaSnapshot({ installPrompt: event, visible: shouldShow });
    };
    const handleAppInstalled = () => {
      markPwaInstalled(getBrowserStorage("localStorage"));
      publishPwaSnapshot({
        installPrompt: null,
        installed: true,
        visible: false,
      });
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  useEffect(() => {
    if (
      !pathname ||
      pathname.startsWith("/api/") ||
      pathname.startsWith("/admin")
    ) {
      return;
    }

    const nextEngagement = recordPwaPromotionEngagement(
      getBrowserStorage("localStorage"),
      getBrowserStorage("sessionStorage"),
      pathname,
    );
    const shouldShow = canOfferPromotion({
      engagement: nextEngagement,
      platform: browserSnapshot.platform,
      installPrompt: browserSnapshot.installPrompt,
    });

    publishPwaSnapshot({ engagement: nextEngagement, visible: shouldShow });
  }, [pathname]);

  useEffect(() => {
    if (!visible) return undefined;

    const hideForSession = () => {
      try {
        getBrowserStorage("sessionStorage")?.setItem(
          PWA_PROMOTION_OFFERED_KEY,
          "1",
        );
      } catch {
        // The external snapshot still hides the promotion for this mounted page.
      }
      hidePromotion();
    };
    const handleFocusIn = (event) => {
      if (isSensitiveInteraction(event.target)) hideForSession();
    };
    const handleClick = (event) => {
      if (isSensitiveInteraction(event.target)) hideForSession();
    };

    document.addEventListener("focusin", handleFocusIn, true);
    document.addEventListener("click", handleClick, true);
    return () => {
      document.removeEventListener("focusin", handleFocusIn, true);
      document.removeEventListener("click", handleClick, true);
    };
  }, [visible]);

  const dismiss = () => {
    snoozePwaPromotion(
      getBrowserStorage("localStorage"),
      Date.now(),
      PWA_PROMOTION_DISMISS_MS,
    );
    hidePromotion();
    setShowInstructions(false);
  };

  const install = async () => {
    if (!installPrompt || installing) return;
    setInstalling(true);

    try {
      const promptEvent = installPrompt;
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;

      if (choice?.outcome === "accepted") {
        markPwaInstalled(getBrowserStorage("localStorage"));
        publishPwaSnapshot({
          installed: true,
          installPrompt: null,
          visible: false,
        });
      } else {
        snoozePwaPromotion(
          getBrowserStorage("localStorage"),
          Date.now(),
          PWA_PROMOTION_PROMPT_DISMISS_MS,
        );
        publishPwaSnapshot({ installPrompt: null, visible: false });
      }
    } catch {
      // The browser may invalidate a deferred prompt; retain the manual instructions as fallback.
      publishPwaSnapshot({ installPrompt: null, visible: true });
      setShowInstructions(true);
    } finally {
      setInstalling(false);
    }
  };

  if (!visible || !canPromotePwaInstall({ platform, hasNativePrompt }))
    return null;

  return (
    <aside
      className="pwa-install-promotion"
      aria-label={`Pemasangan ${siteConfig.shortName}`}
      data-pwa-install-promotion="true"
      data-pwa-install-platform={platform}
    >
      <div className="pwa-install-promotion__header">
        <span className="pwa-install-promotion__app-icon" aria-hidden="true">
          <AppWindow size={22} strokeWidth={1.8} />
        </span>
        <div className="pwa-install-promotion__copy">
          <p className="pwa-install-promotion__eyebrow">Akses lebih praktis</p>
          <h2>{siteConfig.shortName}</h2>
          <p className="pwa-install-promotion__description">
            Buka katalog dan informasi data langsung dari layar utama.
          </p>
        </div>
        <button
          className="pwa-install-promotion__close"
          type="button"
          onClick={dismiss}
          aria-label="Tutup promosi pemasangan aplikasi"
          title="Nanti saja"
        >
          <X size={18} aria-hidden="true" />
        </button>
      </div>

      {hasNativePrompt ? (
        <button
          className="pwa-install-promotion__action"
          type="button"
          onClick={install}
          disabled={installing}
        >
          <Download size={16} aria-hidden="true" />
          {installing ? "Menyiapkan pemasangan…" : "Pasang aplikasi"}
        </button>
      ) : (
        <button
          className="pwa-install-promotion__action"
          type="button"
          onClick={() => setShowInstructions((current) => !current)}
          aria-expanded={showInstructions}
          aria-controls="pwa-install-instructions"
        >
          {platform === "ios" ? (
            <Share2 size={16} aria-hidden="true" />
          ) : (
            <MoreHorizontal size={17} aria-hidden="true" />
          )}
          {showInstructions ? "Sembunyikan panduan" : "Cara memasang"}
          <ChevronDown
            size={15}
            className={
              showInstructions
                ? "pwa-install-promotion__chevron is-open"
                : "pwa-install-promotion__chevron"
            }
            aria-hidden="true"
          />
        </button>
      )}

      {showInstructions && (
        <div
          className="pwa-install-promotion__instructions"
          id="pwa-install-instructions"
        >
          <ol>
            {instructions.map((instruction, index) => (
              <li key={`${platform}-${index}`}>{instruction}</li>
            ))}
          </ol>
          {platform === "ios" && (
            <p className="pwa-install-promotion__note">
              Pada iPhone/iPad, gunakan menu Bagikan browser. Jika opsi tidak
              tersedia, buka portal melalui Safari dan pilih Tambahkan ke Layar
              Utama.
            </p>
          )}
        </div>
      )}

      <p className="pwa-install-promotion__footnote">
        Opsional dan dapat ditutup kapan saja.
      </p>
    </aside>
  );
}
