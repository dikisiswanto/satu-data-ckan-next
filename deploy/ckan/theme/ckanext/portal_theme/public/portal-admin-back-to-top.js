(() => {
  "use strict";

  const SHELL = ".portal-admin-shell";
  const BUTTON_ID = "portal-admin-back-to-top";
  const SHOW_AFTER = 560;

  function init() {
    if (!document.querySelector(SHELL) || document.getElementById(BUTTON_ID))
      return;

    const button = document.createElement("button");
    button.id = BUTTON_ID;
    button.type = "button";
    button.className = "portal-admin-back-to-top";
    button.setAttribute("aria-label", "Kembali ke bagian atas halaman");
    button.title = "Kembali ke atas";
    button.hidden = true;
    button.innerHTML = '<span aria-hidden="true">↑</span>';
    button.addEventListener("click", () => {
      const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: reduceMotion ? "auto" : "smooth",
      });
    });
    document.body.appendChild(button);

    let frame = 0;
    const update = () => {
      frame = 0;
      button.hidden = window.scrollY <= SHOW_AFTER;
    };
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pageshow", update);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
