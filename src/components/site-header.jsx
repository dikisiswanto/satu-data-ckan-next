"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { Search, LockKeyhole, Menu, X, ArrowUpRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { NavigationLink } from "@/components/ui/navigation-link";
import { cn } from "@/lib/utils";
import { siteConfig } from "@/lib/site-config";
import { publicNavigation } from "@/lib/public-navigation";

export function SiteHeader() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const previousPathname = useRef(pathname);
  const menuRef = useRef(null);
  const menuButtonRef = useRef(null);

  useEffect(() => {
    let lastScrolled = window.scrollY > 12;
    let frame = 0;
    const initialFrame = window.requestAnimationFrame(() => {
      setScrolled(window.scrollY > 12);
    });

    const update = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        const nextScrolled = window.scrollY > 12;
        // The header has only two visual states; avoid scheduling a React update
        // for every scroll event while the current state has not changed.
        if (nextScrolled !== lastScrolled) {
          lastScrolled = nextScrolled;
          setScrolled(nextScrolled);
        }
      });
    };

    window.addEventListener("scroll", update, { passive: true });
    return () => {
      window.removeEventListener("scroll", update);
      if (frame) window.cancelAnimationFrame(frame);
      window.cancelAnimationFrame(initialFrame);
    };
  }, []);

  // Close the disclosure only after navigation. Resetting on mount can race
  // with the first tap and immediately hide the menu on slower devices.
  useEffect(() => {
    if (previousPathname.current === pathname) return;
    previousPathname.current = pathname;
    setMobileMenuOpen(false);
  }, [pathname]);

  // Escape and outside clicks dismiss the menu; Escape restores focus to its trigger.
  useEffect(() => {
    if (!mobileMenuOpen) return undefined;

    const onPointerDown = (event) => {
      if (
        !menuRef.current?.contains(event.target) &&
        !menuButtonRef.current?.contains(event.target)
      ) {
        setMobileMenuOpen(false);
      }
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        setMobileMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    };

    const desktopBreakpoint = window.matchMedia("(min-width: 1280px)");
    const onBreakpointChange = (event) => {
      if (event.matches) setMobileMenuOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    desktopBreakpoint.addEventListener("change", onBreakpointChange);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      desktopBreakpoint.removeEventListener("change", onBreakpointChange);
    };
  }, [mobileMenuOpen]);

  const isActive = (link) =>
    link.exact
      ? pathname === link.href
      : (link.match || []).some(
          (path) => pathname === path || pathname.startsWith(`${path}/`),
        );

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <header
      className={cn(
        "site-header sticky top-0 z-40 transition-[background-color,box-shadow,border-color] duration-200",
        scrolled ? "site-header-scrolled" : "site-header-at-top",
      )}
    >
      <div className="page-container flex min-h-[60px] items-center justify-between gap-2 xl:gap-3 max-[639px]:px-3 lg:min-h-[64px]">
        <Link
          href="/"
          className="flex min-w-0 items-center gap-2 rounded-md sm:gap-3"
          aria-label={`${siteConfig.name} — Beranda`}
        >
          <span className="flex size-11 shrink-0 items-center justify-center">
            <Image
              src={siteConfig.logoPath}
              alt={siteConfig.logoAlt}
              width={48}
              height={56}
              priority
              className="h-11 w-auto object-contain"
            />
          </span>
          <span className="site-brand-copy block min-w-0 leading-tight">
            <span className="block truncate text-sm font-bold tracking-tight sm:text-base">
              {siteConfig.shortName}
            </span>
            <span className="block truncate text-xs text-muted">
              {siteConfig.publicSubtitle}
            </span>
          </span>
        </Link>

        <nav
          aria-label="Navigasi utama"
          className="hidden items-center gap-1.5 xl:flex 2xl:gap-2"
        >
          {publicNavigation.map((link) => {
            const active = isActive(link);
            const Icon = link.icon;
            return (
              <NavigationLink
                key={link.label}
                href={link.href}
                active={active}
                variant="public"
                icon={Icon}
                iconSize={link.href === "/" ? 18 : 15}
                title={link.label}
                aria-label={link.href === "/" ? "Beranda" : undefined}
                className="gap-[0.3rem] px-[0.45rem] text-sm leading-tight tracking-normal [&>svg]:shrink-0"
              >
                {link.href !== "/" && (
                  <span>{link.desktopLabel || link.label}</span>
                )}
              </NavigationLink>
            );
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <Link
            href="/dataset"
            className={cn(
              "inline-flex size-10 items-center justify-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2",
              pathname === "/" && !scrolled
                ? "text-white hover:text-white"
                : "text-ink hover:text-primary",
              pathname === "/" &&
                !scrolled &&
                "homepage-header-icon drop-shadow-[0_1px_2px_rgb(0_0_0_/_0.55)]",
            )}
            aria-label="Cari dataset"
            title="Cari dataset"
          >
            <Search size={19} aria-hidden="true" />
          </Link>

          <a
            href={
              process.env.NEXT_PUBLIC_CKAN_ADMIN_URL ||
              "https://ckan.wajokab.go.id"
            }
            target="_blank"
            rel="noopener noreferrer"
            className="hidden min-h-10 items-center gap-2 rounded-lg bg-primary px-3.5 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 xl:inline-flex sm:px-4"
          >
            <LockKeyhole size={15} aria-hidden="true" />
            <span>Portal Pengelola</span>
          </a>

          <div className="relative xl:hidden" ref={menuRef}>
            <button
              ref={menuButtonRef}
              type="button"
              className={cn(
                "inline-flex size-10 items-center justify-center rounded-xl border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2",
                pathname === "/" && !scrolled
                  ? "homepage-header-icon border-white/35 text-white hover:bg-white/15 hover:text-white"
                  : "border-line text-ink hover:bg-accent hover:text-primary",
              )}
              aria-label={mobileMenuOpen ? "Tutup navigasi" : "Buka navigasi"}
              aria-expanded={mobileMenuOpen}
              aria-controls="site-mobile-navigation"
              onClick={() => setMobileMenuOpen((open) => !open)}
            >
              {mobileMenuOpen ? (
                <X size={19} aria-hidden="true" />
              ) : (
                <Menu size={19} aria-hidden="true" />
              )}
            </button>

            <div
              id="site-mobile-navigation"
              hidden={!mobileMenuOpen}
              className="header-mobile-menu absolute right-0 top-full z-50 mt-2 w-[min(21rem,calc(100vw-1.5rem))] rounded-2xl border border-line bg-surface p-2.5 text-ink shadow-[0_16px_45px_rgb(15_35_50_/_0.18)]"
            >
              <nav aria-label="Navigasi seluler" className="grid gap-1">
                {publicNavigation.map((link) => {
                  const active = isActive(link);
                  const Icon = link.icon;
                  return (
                    <NavigationLink
                      key={link.label}
                      href={link.href}
                      active={active}
                      variant="public"
                      icon={Icon}
                      iconSize={17}
                      aria-label={link.href === "/" ? "Beranda" : undefined}
                      title={link.label}
                      onClick={closeMobileMenu}
                      className={cn(
                        "min-h-11 w-full justify-between rounded-xl px-3 py-2.5 text-sm font-semibold !text-ink hover:!bg-accent hover:!text-primary",
                        "[&>svg:last-child]:ml-auto focus-visible:ring-offset-1",
                        active &&
                          "!bg-accent !text-primary !shadow-[inset_3px_0_0_var(--color-primary)]",
                      )}
                    >
                      <span>{link.label}</span>
                      <ArrowUpRight size={14} aria-hidden="true" />
                    </NavigationLink>
                  );
                })}
              </nav>

              <div className="my-2.5 border-t border-line/70" />
              <a
                href={
                  process.env.NEXT_PUBLIC_CKAN_ADMIN_URL ||
                  "https://ckan.wajokab.go.id"
                }
                target="_blank"
                rel="noopener noreferrer"
                onClick={closeMobileMenu}
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2"
              >
                <LockKeyhole size={16} aria-hidden="true" />
                <span>Masuk ke Portal Pengelola</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
