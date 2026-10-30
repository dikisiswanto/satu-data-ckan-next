import Link from "next/link";
import {
  ArrowUpRight,
  Building2,
  CalendarRange,
  Clock3,
  FileType,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import {
  ckanExtraValue,
  ckanPackageCategory,
  ckanResourceFormat,
} from "@/lib/ckan/client";

export function DatasetCard({ dataset }) {
  const organizationName = dataset.organization?.title || dataset.organization?.name;
  const resources = Array.isArray(dataset.resources)
    ? dataset.resources.filter((resource) => resource && typeof resource === "object")
    : [];
  const formats = [...new Set(resources.map(ckanResourceFormat).filter(Boolean))]
    .slice(0, 3)
    .map((format) => format.toUpperCase());
  const referencePeriod = ckanExtraValue(dataset, [
    "portal_reference_period",
    "portal_period",
    "temporal_coverage",
    "temporal_period",
    "periode_data",
  ]);
  const lastUpdated = dataset.metadata_modified || dataset.metadata_created;

  return (
    <Card className="flex h-full flex-col shadow-[0_4px_20px_rgb(24_58_68_/_0.04)] transition hover:-translate-y-0.5 hover:shadow-md">
      <CardHeader className="flex-1">
        <div className="flex items-start justify-between gap-3">
          <Badge variant="primary">{ckanPackageCategory(dataset)}</Badge>
          <ArrowUpRight
            aria-hidden="true"
            className="shrink-0 text-muted"
            size={17}
          />
        </div>
        <h2 className="mt-4 text-lg font-semibold leading-snug">
          <Link
            className="rounded-sm hover:text-primary focus-visible:outline-none"
            href={`/dataset/${dataset.name}`}
          >
            {dataset.title || dataset.name}
          </Link>
        </h2>
        <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted">
          {dataset.notes || "Deskripsi dataset belum dicantumkan."}
        </p>
      </CardHeader>
      <CardContent className="mt-auto space-y-3 text-xs text-muted">
        <p className="flex min-w-0 items-start gap-2">
          <Building2
            size={14}
            aria-hidden="true"
            className="mt-0.5 shrink-0"
          />
          <span className="line-clamp-2">{organizationName || "Organisasi belum dicantumkan"}</span>
        </p>
        {referencePeriod || formats.length ? (
          <div className="flex flex-wrap gap-1.5">
            {referencePeriod ? (
              <span className="inline-flex max-w-full items-center gap-1.5 rounded-md bg-canvas px-2 py-1 leading-5">
                <CalendarRange size={13} aria-hidden="true" className="shrink-0" />
                <span className="break-words">Periode {referencePeriod}</span>
              </span>
            ) : null}
            {formats.length ? (
              <span className="inline-flex items-center gap-1.5 rounded-md bg-canvas px-2 py-1 leading-5">
                <FileType size={13} aria-hidden="true" className="shrink-0" />
                <span>{formats.join(" · ")}</span>
                {resources.length > formats.length ? (
                  <span className="text-muted/80">+{resources.length - formats.length} resource</span>
                ) : null}
              </span>
            ) : null}
          </div>
        ) : null}
        <p className="flex items-center gap-2 border-t border-line/70 pt-3">
          <Clock3 size={14} aria-hidden="true" className="shrink-0" />
          <span>Diperbarui {formatDate(lastUpdated)}</span>
        </p>
      </CardContent>
    </Card>
  );
}
