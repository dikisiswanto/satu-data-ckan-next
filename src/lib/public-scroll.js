/** Run a programmatic scroll without the site's smooth-scroll animation. */
function withInstantScroll(action) {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  const root = document.documentElement;
  const previousBehavior = root.style.scrollBehavior;
  root.style.scrollBehavior = "auto";
  try {
    action();
  } finally {
    root.style.scrollBehavior = previousBehavior;
  }
}

export function scrollPublicPageToTop() {
  withInstantScroll(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  });
}

export function scrollToPublicList(element) {
  if (!element) return;
  withInstantScroll(() => {
    element.scrollIntoView({
      block: "start",
      inline: "nearest",
      behavior: "auto",
    });
  });
}
