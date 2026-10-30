import { cn } from "@/lib/utils";

export function PageHeading({
  eyebrow,
  title,
  description,
  children,
  className,
  reserveTitle = false,
  reserveDescription = false,
  compact = false,
}) {
  return (
    <header
      className={cn(
        "public-page-heading mb-7 flex flex-col sm:mb-8 sm:flex-row sm:items-end sm:justify-between",
        compact ? "gap-2" : "gap-3",
        className,
      )}
    >
      <div className={cn("max-w-3xl", compact ? "space-y-1.5" : "space-y-3")}>
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h1
          className={cn(
            "text-3xl font-semibold leading-tight sm:text-4xl",
            reserveTitle && "public-heading-title-reserved",
          )}
        >
          {title}
        </h1>
        {description ? (
          <p
            className={cn(
              "max-w-2xl text-base leading-7 text-muted",
              reserveDescription && "public-heading-description-reserved",
            )}
          >
            {description}
          </p>
        ) : null}
      </div>
      {children}
    </header>
  );
}
