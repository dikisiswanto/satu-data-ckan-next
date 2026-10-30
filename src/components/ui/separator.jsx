import { cn } from "@/lib/utils";

export function Separator({ className, orientation = "horizontal", decorative = true, ...props }) {
  const vertical = orientation === "vertical";
  return (
    <div
      role={decorative ? "none" : "separator"}
      aria-orientation={decorative ? undefined : orientation}
      className={cn(
        "shrink-0 bg-line",
        vertical ? "h-full w-px" : "h-px w-full",
        className,
      )}
      {...props}
    />
  );
}
