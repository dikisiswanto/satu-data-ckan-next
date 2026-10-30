import Link from "next/link";
import { cn } from "@/lib/utils";

const variants = {
  public: {
    base: "public-link relative inline-flex min-h-10 items-center gap-1 whitespace-nowrap rounded-lg px-2 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2",
    active: "public-link-active",
    inactive: "text-[#40566a] hover:bg-[#eef4fa] hover:text-[#174ea6]",
  },
};

export function NavigationLink({
  href,
  active = false,
  variant = "public",
  icon: Icon,
  children,
  className,
  iconSize = 16,
  ...props
}) {
  const style = variants[variant] ?? variants.public;

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      prefetch={variant === "portal" ? false : undefined}
      className={cn(
        style.base,
        active ? style.active : style.inactive,
        className,
      )}
      {...props}
    >
      {Icon ? (
        <Icon
          size={iconSize}
          strokeWidth={active ? 2.2 : 1.8}
          aria-hidden="true"
        />
      ) : null}
      {children}
    </Link>
  );
}
