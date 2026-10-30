import { cn } from "@/lib/utils";

export function PageHeading({
  eyebrow,
  title,
  description,
  children,
  className,
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
        <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">
          {title}
        </h1>
        {description ? (
          <p className="max-w-2xl text-base leading-7 text-muted">
            {description}
          </p>
        ) : null}
      </div>
      {children}
    </header>
  );
}
