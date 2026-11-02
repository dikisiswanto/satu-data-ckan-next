(() => {
  "use strict";

  const ADMIN_SHELL = ".wajo-admin-shell, .wajo-login-frame";
  const BAR_ID = "wajo-admin-navigation-progress";
  const FALLBACK_MS = 12000;
  let fallbackTimer = null;
  let active = false;

  function isAdminPage() {
    return Boolean(
      document.body?.matches(ADMIN_SHELL) ||
      document.body?.querySelector(ADMIN_SHELL),
    );
  }

  function getBar() {
    let bar = document.getElementById(BAR_ID);
    if (bar) return bar;
    if (!document.body) return null;

    bar = document.createElement("div");
    bar.id = BAR_ID;
    bar.className = "wajo-admin-navigation-progress";
    bar.setAttribute("aria-hidden", "true");
    const fill = document.createElement("span");
    bar.appendChild(fill);
    document.body.appendChild(bar);
    return bar;
  }

  function stop() {
    active = false;
    if (fallbackTimer) {
      window.clearTimeout(fallbackTimer);
      fallbackTimer = null;
    }
    const bar = document.getElementById(BAR_ID);
    if (bar) bar.classList.remove("is-active");
  }

  function start() {
    if (active || !isAdminPage()) return;
    const bar = getBar();
    if (!bar) return;
    active = true;
    bar.classList.add("is-active");
    if (fallbackTimer) window.clearTimeout(fallbackTimer);
    fallbackTimer = window.setTimeout(stop, FALLBACK_MS);
  }

  function isPlainSameOriginNavigation(anchor, event) {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      anchor.hasAttribute("download") ||
      (anchor.target && anchor.target.toLowerCase() !== "_self") ||
      /\bexternal\b/i.test(anchor.rel || "")
    )
      return false;

    let target;
    try {
      target = new URL(anchor.href, window.location.href);
    } catch {
      return false;
    }
    if (target.origin !== window.location.origin) return false;
    if (
      target.pathname === window.location.pathname &&
      target.search === window.location.search
    ) {
      return false;
    }
    return true;
  }

  function onClick(event) {
    if (!isAdminPage() || !(event.target instanceof Element)) return;
    const anchor = event.target.closest("a[href]");
    if (!anchor || !isPlainSameOriginNavigation(anchor, event)) return;
    start();
  }

  function onSubmit(event) {
    if (!isAdminPage() || event.defaultPrevented) return;
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return;
    if (form.hasAttribute("data-no-navigation-progress")) return;
    if (form.target && form.target.toLowerCase() !== "_self") return;
    if (String(form.method || "get").toLowerCase() === "dialog") return;
    start();
  }

  function init() {
    if (!isAdminPage()) return;
    document.addEventListener("click", onClick);
    document.addEventListener("submit", onSubmit);
    window.addEventListener("pageshow", stop);
    window.addEventListener("focus", () => {
      if (document.visibilityState === "visible") stop();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
