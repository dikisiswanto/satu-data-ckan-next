"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Check,
  Code2,
  Copy,
  ExternalLink,
  FileJson,
  Table2,
} from "lucide-react";

function resourceFormatValues(resource = {}) {
  return [resource.format, resource.mimetype, resource.name]
    .filter(Boolean)
    .map((value) => String(value).toLowerCase());
}

function isTabular(resource = {}) {
  return resourceFormatValues(resource).some((value) =>
    /(?:^|[./;\s_-])(csv|tsv|xls|xlsx|ods)(?:$|[;\s?#._-])/i.test(value),
  );
}

function isDelimited(resource = {}) {
  return resourceFormatValues(resource).some((value) =>
    /(?:^|[./;\s_-])(csv|tsv)(?:$|[;\s?#._-])/i.test(value),
  );
}

function CopyEndpoint({ path, label = "Salin endpoint" }) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(
        new URL(path, window.location.origin).toString(),
      );
      setCopied(true);
      setFailed(false);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setFailed(true);
      setCopied(false);
    }
  }
  return (
    <div className="dataset-api-endpoint">
      <code title={path}>{path}</code>
      <button
        type="button"
        onClick={copy}
        className="dataset-api-copy"
        aria-label={`${label}: ${path}`}
      >
        {copied ? (
          <Check size={14} aria-hidden="true" />
        ) : (
          <Copy size={14} aria-hidden="true" />
        )}
        <span>{copied ? "Tersalin" : label}</span>
      </button>
      {failed ? (
        <span className="sr-only" role="status">
          Tidak dapat menyalin otomatis. Pilih teks endpoint untuk menyalinnya.
        </span>
      ) : null}
    </div>
  );
}

export function DatasetApiAccess({ datasetName, resources = [] }) {
  const packagePath = `/api/3/action/package_show?id=${encodeURIComponent(datasetName)}`;
  const safeResources = resources.filter((resource) => resource?.id);
  return (
    <section
      id="akses-api"
      className="dataset-api-panel"
      aria-labelledby="dataset-api-title"
    >
      <div className="dataset-api-panel__header">
        <span className="dataset-api-panel__icon">
          <Code2 size={19} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="dataset-api-title">Akses API dataset</h2>
          <p>
            Gunakan endpoint JSON untuk mengambil metadata dan data resource
            secara terprogram. API publik hanya menyediakan akses baca.
          </p>
        </div>
        <Link href="/api-data" className="dataset-api-doc-link">
          Dokumentasi API <ExternalLink size={13} aria-hidden="true" />
        </Link>
      </div>

      <div className="dataset-api-entry">
        <div className="dataset-api-entry__title">
          <FileJson size={16} aria-hidden="true" />
          <strong>Metadata dataset</strong>
          <span>GET</span>
        </div>
        <CopyEndpoint path={packagePath} />
        <a
          href={packagePath}
          target="_blank"
          rel="noreferrer"
          className="dataset-api-open"
        >
          Buka respons JSON <ExternalLink size={13} aria-hidden="true" />
        </a>
      </div>

      {safeResources.length ? (
        <div className="dataset-api-resources">
          {safeResources.map((resource) => {
            const resourcePath = `/api/3/action/resource_show?id=${encodeURIComponent(resource.id)}`;
            const datastorePath = `/api/3/action/datastore_search?resource_id=${encodeURIComponent(resource.id)}&limit=100`;
            return (
              <details className="dataset-api-resource" key={resource.id}>
                <summary>
                  <Table2 size={15} aria-hidden="true" />
                  <span>{resource.name || resource.id}</span>
                  <small>
                    {String(
                      resource.format || resource.mimetype || "Resource",
                    ).toUpperCase()}
                  </small>
                </summary>
                <div className="dataset-api-resource__body">
                  <p>Metadata resource</p>
                  <CopyEndpoint path={resourcePath} />
                  <a
                    href={resourcePath}
                    target="_blank"
                    rel="noreferrer"
                    className="dataset-api-open"
                  >
                    Buka metadata resource{" "}
                    <ExternalLink size={13} aria-hidden="true" />
                  </a>
                  {isTabular(resource) ? (
                    <>
                      <p className="mt-3">
                        Isi tabel DataStore{" "}
                        <span className="dataset-api-method">GET</span>
                      </p>
                      <CopyEndpoint path={datastorePath} />
                      <a
                        href={datastorePath}
                        target="_blank"
                        rel="noreferrer"
                        className="dataset-api-open"
                      >
                        Buka data JSON{" "}
                        <ExternalLink size={13} aria-hidden="true" />
                      </a>
                      {resource.datastore_active !== true ? (
                        <small className="dataset-api-pending">
                          DataStore sedang disiapkan. Endpoint data lengkap
                          dapat digunakan setelah resource selesai diindeks.
                        </small>
                      ) : null}
                      {resource.datastore_active !== true &&
                      isDelimited(resource) ? (
                        <>
                          <p className="mt-3">
                            Pratinjau sementara CSV/TSV{" "}
                            <span className="dataset-api-method">GET</span>
                          </p>
                          <CopyEndpoint
                            path={`/api/public/resource-preview?resource_id=${encodeURIComponent(resource.id)}&limit=25`}
                          />
                          <a
                            href={`/api/public/resource-preview?resource_id=${encodeURIComponent(resource.id)}&limit=25`}
                            target="_blank"
                            rel="noreferrer"
                            className="dataset-api-open"
                          >
                            Buka pratinjau terbatas (JSON){" "}
                            <ExternalLink size={13} aria-hidden="true" />
                          </a>
                        </>
                      ) : null}
                    </>
                  ) : null}
                </div>
              </details>
            );
          })}
        </div>
      ) : (
        <p className="dataset-api-empty">
          Belum ada resource publik untuk dataset ini.
        </p>
      )}
      <p className="dataset-api-note">
        Contoh URL menggunakan domain portal publik. Batas permintaan,
        parameter, dan contoh pemakaian tersedia pada dokumentasi API.
      </p>
    </section>
  );
}
