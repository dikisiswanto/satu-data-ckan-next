import { cn } from "@/lib/utils";

export const fieldStyles =
  "block min-h-11 w-full rounded-control border border-line bg-surface px-3.5 py-3 text-sm text-ink shadow-sm placeholder:text-muted placeholder:opacity-100 focus:border-focus focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/25";

export function Input({ className, ...props }) {
  return <input className={cn(fieldStyles, className)} {...props} />;
}
