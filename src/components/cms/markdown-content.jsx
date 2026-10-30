import Image from "next/image";
import Link from "next/link";
import { publicCmsImageUrl } from "@/lib/cms/pages";
import { getPublicSiteOrigin } from "@/lib/site-config";

function safeHref(value) {
  const candidate = String(value || "").trim();
  if (!candidate || candidate.startsWith("//") || candidate.startsWith("\\"))
    return null;
  if (candidate.startsWith("/") && !candidate.includes("\\")) return candidate;
  try {
    const url = new URL(candidate);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function renderInline(source, keyPrefix) {
  const tokens =
    /(!\[[^\]]*\]\([^)]+\)|\[[^\]]+\]\([^)]+\)|`[^`]+`|\*\*[^*]+\*\*|__[^_]+__|\*[^*]+\*|_[^_]+_)/g;
  const output = [];
  let cursor = 0;
  let tokenIndex = 0;
  for (const match of source.matchAll(tokens)) {
    const index = match.index ?? 0;
    if (index > cursor) output.push(source.slice(cursor, index));
    const token = match[0];
    const key = `${keyPrefix}-${tokenIndex++}`;
    const image = token.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    const link = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (image) {
      const src = publicCmsImageUrl(image[2], getPublicSiteOrigin());
      output.push(
        src ? (
          <Image
            key={key}
            src={src}
            alt={image[1] || "Ilustrasi konten"}
            width={960}
            height={640}
            unoptimized
            className="my-3 h-auto max-h-[34rem] w-auto max-w-full rounded-xl border border-line object-contain"
          />
        ) : (
          image[1]
        ),
      );
    } else if (link) {
      const href = safeHref(link[2]);
      output.push(
        href ? (
          href.startsWith("/") ? (
            <Link
              key={key}
              href={href}
              className="font-semibold text-primary underline underline-offset-4"
            >
              {link[1]}
            </Link>
          ) : (
            <a
              key={key}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-primary underline underline-offset-4"
            >
              {link[1]}
            </a>
          )
        ) : (
          link[1]
        ),
      );
    } else if (token.startsWith("`")) {
      output.push(
        <code
          key={key}
          className="rounded bg-slate-100 px-1.5 py-0.5 text-[0.9em]"
        >
          {token.slice(1, -1)}
        </code>,
      );
    } else if (token.startsWith("**") || token.startsWith("__")) {
      output.push(<strong key={key}>{token.slice(2, -2)}</strong>);
    } else {
      output.push(<em key={key}>{token.slice(1, -1)}</em>);
    }
    cursor = index + token.length;
  }
  if (cursor < source.length) output.push(source.slice(cursor));
  return output;
}

function isBlockStart(lines, index) {
  const line = lines[index] || "";
  return /^\s*(#{1,4}\s|[-*+]\s|\d+\.\s|>\s?|```|---+\s*$)/.test(line);
}

export function MarkdownContent({ content }) {
  const source = String(content || "")
    .replace(/\r\n?/g, "\n")
    .slice(0, 240_000);
  const lines = source.split("\n");
  const blocks = [];
  let index = 0;
  let blockIndex = 0;

  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) {
      index += 1;
      continue;
    }

    if (line.trim().startsWith("```")) {
      const language = line.trim().slice(3).trim().slice(0, 32);
      index += 1;
      const code = [];
      while (index < lines.length && !lines[index].trim().startsWith("```"))
        code.push(lines[index++]);
      if (index < lines.length) index += 1;
      blocks.push(
        <pre
          key={`code-${blockIndex++}`}
          className="my-5 overflow-x-auto rounded-xl bg-slate-950 p-4 text-sm leading-6 text-slate-100"
        >
          <code data-language={language || undefined}>{code.join("\n")}</code>
        </pre>,
      );
      continue;
    }

    const heading = line.match(/^(#{1,4})\s+(.+)$/);
    if (heading) {
      const level = Math.min(heading[1].length + 1, 5);
      const Heading = `h${level}`;
      blocks.push(
        <Heading
          key={`heading-${blockIndex++}`}
          className="mb-3 mt-8 font-semibold tracking-tight text-ink first:mt-0"
        >
          {renderInline(heading[2], `h-${index}`)}
        </Heading>,
      );
      index += 1;
      continue;
    }

    if (/^\s*---+\s*$/.test(line)) {
      blocks.push(
        <hr key={`rule-${blockIndex++}`} className="my-7 border-line" />,
      );
      index += 1;
      continue;
    }

    if (/^>\s?/.test(line)) {
      const quote = [];
      while (index < lines.length && /^>\s?/.test(lines[index]))
        quote.push(lines[index++].replace(/^>\s?/, ""));
      blocks.push(
        <blockquote
          key={`quote-${blockIndex++}`}
          className="my-5 border-l-4 border-primary/30 pl-4 text-muted"
        >
          {quote.map((item, itemIndex) => (
            <p key={itemIndex}>{renderInline(item, `q-${itemIndex}`)}</p>
          ))}
        </blockquote>,
      );
      continue;
    }

    if (/^\s*[-*+]\s+/.test(line)) {
      const items = [];
      while (index < lines.length && /^\s*[-*+]\s+/.test(lines[index]))
        items.push(lines[index++].replace(/^\s*[-*+]\s+/, ""));
      blocks.push(
        <ul
          key={`list-${blockIndex++}`}
          className="my-4 list-disc space-y-2 pl-6"
        >
          {items.map((item, itemIndex) => (
            <li key={itemIndex}>{renderInline(item, `ul-${itemIndex}`)}</li>
          ))}
        </ul>,
      );
      continue;
    }

    if (/^\s*\d+\.\s+/.test(line)) {
      const items = [];
      while (index < lines.length && /^\s*\d+\.\s+/.test(lines[index]))
        items.push(lines[index++].replace(/^\s*\d+\.\s+/, ""));
      blocks.push(
        <ol
          key={`list-${blockIndex++}`}
          className="my-4 list-decimal space-y-2 pl-6"
        >
          {items.map((item, itemIndex) => (
            <li key={itemIndex}>{renderInline(item, `ol-${itemIndex}`)}</li>
          ))}
        </ol>,
      );
      continue;
    }

    const paragraph = [line];
    index += 1;
    while (
      index < lines.length &&
      lines[index].trim() &&
      !isBlockStart(lines, index)
    )
      paragraph.push(lines[index++]);
    blocks.push(
      <p
        key={`paragraph-${blockIndex++}`}
        className="my-4 whitespace-pre-line leading-8 text-slate-700"
      >
        {paragraph.map((part, partIndex) => (
          <span key={partIndex}>
            {partIndex ? "\n" : ""}
            {renderInline(part, `p-${blockIndex}-${partIndex}`)}
          </span>
        ))}
      </p>,
    );
  }

  return <div className="cms-markdown">{blocks}</div>;
}
