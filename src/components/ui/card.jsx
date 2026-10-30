import { cn } from "@/lib/utils";

export function Card({ as: Component = "div", className, ...props }) {
  return (
    <Component
      className={cn(
        "min-w-0 rounded-xl border border-line bg-surface text-ink",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }) {
  return <div className={cn("space-y-2 p-5 sm:p-6", className)} {...props} />;
}

export function CardContent({ className, ...props }) {
  return (
    <div className={cn("px-5 pb-5 sm:px-6 sm:pb-6", className)} {...props} />
  );
}
