import { cn } from "@/lib/utils";

export function PageHeading({
  eyebrow,
  title,
  description,
  children,
  className,
  reserveTitle = false,
  reserveDescription = false,
}) {
  return (
    <header
      className={cn(
        "public-page-heading mb-9 flex flex-col gap-4 sm:mb-10 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="max-w-3xl space-y-3">
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
