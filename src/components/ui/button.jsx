import Link from "next/link";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";
const buttonStyles = cva(
  "inline-flex min-w-0 shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-control text-sm font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90",
        primary: "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90",
        outline: "border border-line bg-surface text-ink shadow-sm hover:bg-accent hover:text-primary",
        secondary: "border border-line bg-surface text-ink shadow-sm hover:bg-canvas",
        ghost: "text-ink hover:bg-accent hover:text-primary",
        destructive: "bg-red-700 text-white shadow-sm hover:bg-red-800",
        danger: "bg-red-700 text-white shadow-sm hover:bg-red-800",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-9 rounded-lg px-3 text-xs sm:text-sm",
        md: "h-11 px-4 py-2",
        lg: "h-12 rounded-lg px-5",
        icon: "size-10 rounded-lg p-0",
      },
    },
    defaultVariants: { variant: "default", size: "md" },
  },
);
export function Button({ className, variant, size, href, children, prefetch, ...props }) {
  const classes = cn(buttonStyles({ variant, size }), className);
  if (href)
    return (
      <Link
        className={classes}
        href={href}
        prefetch={prefetch ?? (typeof href === "string" && /^https?:\/\//i.test(href) ? false : undefined)}
        {...props}
      >
        {children}
      </Link>
    );
  return (
    <button className={classes} {...props}>
      {children}
    </button>
  );
}
