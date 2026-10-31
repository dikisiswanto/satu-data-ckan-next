import Image from "next/image";
import Link from "next/link";
import { parseMarkdown } from "@/lib/markdown/parse-markdown";
import { publicCmsImageUrl } from "@/lib/cms/pages";
import { publicResourceUrl } from "@/lib/ckan/public-resource-url";
import { getPublicSiteOrigin } from "@/lib/site-config";
import { ImageLightbox } from "@/components/ui/image-lightbox";

export function normalizeMarkdownHref(value) {
  let candidate = String(value || "").trim();
  if (
    !candidate ||
    candidate.startsWith("//") ||
    candidate.startsWith("\\") ||
    /[\u0000-\u001f]/.test(candidate)
  )
    return null;

  if (candidate.startsWith("/") && !candidate.includes("\\")) {
    // CMS images, group logos and CKAN File API assets must stay on the public
    // portal origin instead of resolving against the protected CKAN host.
    const cmsAsset = publicCmsImageUrl(candidate, getPublicSiteOrigin());
    if (cmsAsset) return cmsAsset;
    if (/^\/api\//.test(candidate) || /^\/_next\//.test(candidate)) return null;
    return candidate;
  }

  try {
    const original = new URL(candidate);
    if (original.username || original.password) return null;

    const cmsAsset = publicCmsImageUrl(candidate, getPublicSiteOrigin());
    if (cmsAsset && cmsAsset !== candidate) return cmsAsset;

    const publicResource = publicResourceUrl(candidate);
    if (publicResource) candidate = publicResource;
    else {
      const configuredAdmin =
        process.env.CKAN_ADMIN_URL || process.env.NEXT_PUBLIC_CKAN_ADMIN_URL;
      let adminOrigin = "";
      try {
        adminOrigin = configuredAdmin ? new URL(configuredAdmin).origin : "";
      } catch {
        adminOrigin = "";
      }
      const internalHost = ["ckan", "nginx", "localhost", "127.0.0.1"].includes(
        original.hostname,
      );
      if ((adminOrigin && original.origin === adminOrigin) || internalHost)
        return null;
    }

    const url = new URL(candidate);
    return ["https:", "mailto:", "tel:"].includes(url.protocol) &&
      !url.username &&
      !url.password
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

function renderInline(tokens, keyPrefix) {
  return tokens.map((token, index) => {
    const key = `${keyPrefix}-${index}`;
    if (token.type === "text") return token.value;
    if (token.type === "softbreak") return "\n";
    if (token.type === "break") return <br key={key} />;
    if (token.type === "code")
      return (
        <code key={key} className="cms-markdown__inline-code">
          {token.value}
        </code>
      );
    if (token.type === "strong")
      return <strong key={key}>{renderInline(token.children, key)}</strong>;
    if (token.type === "emphasis")
      return <em key={key}>{renderInline(token.children, key)}</em>;
    if (token.type === "delete")
      return <del key={key}>{renderInline(token.children, key)}</del>;
    if (token.type === "image") {
      const src = publicCmsImageUrl(token.href, getPublicSiteOrigin());
      return src ? (
        <ImageLightbox
          key={key}
          src={src}
          alt={token.label || "Ilustrasi konten"}
          className="cms-markdown__image-trigger"
        >
          <Image
            src={src}
            alt={token.label || "Ilustrasi konten"}
            title={token.title || undefined}
            width={1600}
            height={1100}
            unoptimized
            className="cms-markdown__image"
          />
        </ImageLightbox>
      ) : (
        token.label
      );
    }
    if (token.type === "link") {
      const href = normalizeMarkdownHref(token.href);
      if (!href)
        return renderInline(
          token.children || [
            { type: "text", value: token.label || token.href },
          ],
          key,
        );
      const children = renderInline(
        token.children || [{ type: "text", value: token.label || token.href }],
        key,
      );
      return href.startsWith("/") ? (
        <Link
          key={key}
          href={href}
          title={token.title || undefined}
          className="cms-markdown__link"
        >
          {children}
        </Link>
      ) : (
        <a
          key={key}
          href={href}
          title={token.title || undefined}
          target={href.startsWith("https:") ? "_blank" : undefined}
          rel={
            href.startsWith("https:")
              ? "noopener noreferrer nofollow"
              : undefined
          }
          className="cms-markdown__link"
        >
          {children}
        </a>
      );
    }
    return null;
  });
}

function renderBlocks(blocks, keyPrefix = "md") {
  return blocks.map((block, index) => {
    const key = `${keyPrefix}-${index}`;
    if (block.type === "heading") {
      const Heading = `h${Math.max(1, Math.min(6, block.level))}`;
      return (
        <Heading
          key={key}
          className={`cms-markdown__heading cms-markdown__heading--${block.level}`}
        >
          {renderInline(block.children, key)}
        </Heading>
      );
    }
    if (block.type === "paragraph")
      return (
        <p key={key} className="cms-markdown__paragraph">
          {renderInline(block.children, key)}
        </p>
      );
    if (block.type === "hr")
      return <hr key={key} className="cms-markdown__rule" />;
    if (block.type === "code")
      return (
        <pre key={key} className="cms-markdown__code">
          <code data-language={block.language || undefined}>{block.value}</code>
        </pre>
      );
    if (block.type === "blockquote")
      return (
        <blockquote key={key} className="cms-markdown__quote">
          {renderBlocks(block.blocks, key)}
        </blockquote>
      );
    if (block.type === "table") {
      return (
        <div
          key={key}
          className="cms-markdown__table-wrap"
          role="region"
          aria-label="Tabel data"
          tabIndex={0}
        >
          <table className="cms-markdown__table">
            <thead>
              <tr>
                {block.headers.map((cell, cellIndex) => (
                  <th
                    key={cellIndex}
                    scope="col"
                    style={{ textAlign: block.alignments[cellIndex] || "left" }}
                  >
                    {renderInline(
                      parseMarkdown(cell).flatMap(
                        (item) => item.children || [],
                      ),
                      `${key}-head-${cellIndex}`,
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {block.headers.map((_, cellIndex) => (
                    <td
                      key={cellIndex}
                      style={{
                        textAlign: block.alignments[cellIndex] || "left",
                      }}
                    >
                      {renderInline(
                        parseMarkdown(row[cellIndex] || "").flatMap(
                          (item) => item.children || [],
                        ),
                        `${key}-${rowIndex}-${cellIndex}`,
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    if (block.type === "list") {
      const List = block.ordered ? "ol" : "ul";
      return (
        <List
          key={key}
          start={block.ordered && block.start > 1 ? block.start : undefined}
          className={`cms-markdown__list ${block.ordered ? "cms-markdown__list--ordered" : "cms-markdown__list--unordered"}`}
        >
          {block.items.map((item, itemIndex) => (
            <li
              key={itemIndex}
              className={
                item.checked !== null ? "cms-markdown__task" : undefined
              }
            >
              {item.checked !== null ? (
                <input
                  type="checkbox"
                  checked={item.checked}
                  readOnly
                  tabIndex={-1}
                  aria-label={
                    item.checked ? "Tugas selesai" : "Tugas belum selesai"
                  }
                />
              ) : null}
              <div>{renderBlocks(item.blocks, `${key}-item-${itemIndex}`)}</div>
            </li>
          ))}
        </List>
      );
    }
    return null;
  });
}

export function MarkdownContent({ content, className = "" }) {
  const blocks = parseMarkdown(content);
  return (
    <div className={`cms-markdown ${className}`.trim()}>
      {renderBlocks(blocks)}
    </div>
  );
}
