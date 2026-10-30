import {
  Building2,
  ChartNoAxesCombined,
  Code2,
  Database,
  Home,
  Images,
  BookOpen,
  LifeBuoy,
  Newspaper,
} from "lucide-react";

/** Single source of truth for the public portal's primary routes. */
export const publicNavigation = [
  { href: "/", label: "Beranda", icon: Home, exact: true },
  { href: "/dataset", label: "Dataset", icon: Database, match: ["/dataset"] },
  {
    href: "/statistik",
    label: "Statistik",
    icon: ChartNoAxesCombined,
    match: ["/statistik"],
  },
  {
    href: "/infografik",
    label: "Infografik",
    icon: Images,
    match: ["/infografik"],
  },
  {
    href: "/publikasi",
    label: "Publikasi",
    icon: BookOpen,
    match: ["/publikasi"],
  },
  {
    href: "/informasi",
    label: "Informasi",
    icon: Newspaper,
    match: ["/informasi", "/berita"],
  },
  {
    href: "/organisasi",
    label: "Perangkat Daerah",
    desktopLabel: "OPD",
    icon: Building2,
    match: ["/organisasi"],
  },
  { href: "/bantuan", label: "Bantuan", icon: LifeBuoy, match: ["/bantuan"] },
  { href: "/api-data", label: "API data", icon: Code2, match: ["/api-data"] },
];

export const footerNavigation = publicNavigation.filter(
  ({ href }) => href !== "/",
);
