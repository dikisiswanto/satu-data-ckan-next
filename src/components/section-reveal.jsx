/**
 * Compatibility wrapper for public sections. Content is visible immediately
 * so static text never starts hidden or shifts when an observer fires.
 * Dynamic data should use a route/component Suspense fallback with shimmer.
 */
export function SectionReveal({
  as: Element = "section",
  className = "",
  children,
  ...props
}) {
  return (
    <Element className={className || undefined} {...props}>
      {children}
    </Element>
  );
}
