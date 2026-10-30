import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium leading-none transition-colors",
  {
    variants: {
      variant: {
        neutral: "border-transparent bg-slate-100 text-slate-700",
        default: "border-transparent bg-slate-100 text-slate-700",
        secondary: "border-transparent bg-slate-100 text-slate-700",
        success: "border-emerald-700/15 bg-emerald-50 text-emerald-800",
        warning: "border-amber-700/15 bg-amber-50 text-amber-800",
        danger: "border-red-700/15 bg-red-50 text-red-800",
        primary: "border-transparent bg-accent text-primary",
        outline: "border-line bg-transparent text-ink",
      },
    },
    defaultVariants: { variant: "neutral" },
  },
);

export function Badge({ variant = "neutral", className, ...props }) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}
