import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const styleDir = path.join(root, "src/app/styles");
const globalEntry = path.join(root, "src/app/globals.css");
const errors = [];
const styleFiles = (await readdir(styleDir))
  .filter((name) => name.endsWith(".css"))
  .sort();
const ignoredSelectors = [
  {
    pattern: /\.portal-(?:app|main|form-[\w-]+|table-[\w-]+|tour[\w-]*)\b/,
    label: "legacy CKAN admin selectors",
  },
  { pattern: /\.date-picker-[\w-]+\b/, label: "unused date-picker selectors" },
  {
    pattern: /\.dataset-resource-list\b/,
    label: "unused dataset resource-list selector",
  },
];
let totalBytes = 0;
let totalLines = 0;
const missingImports = [];
const globalCss = await readFile(globalEntry, "utf8");
for (const match of globalCss.matchAll(
  /@import\s+["'](\.\/styles\/[^"']+\.css)["']/g,
)) {
  const resolved = path.resolve(path.dirname(globalEntry), match[1]);
  try {
    await stat(resolved);
  } catch {
    missingImports.push(match[1]);
  }
}
if (missingImports.length)
  errors.push(`Stylesheet yang di-import hilang: ${missingImports.join(", ")}`);
if (!globalCss.includes('@import "tailwindcss";'))
  errors.push("Entrypoint harus memuat Tailwind CSS.");
if (!globalCss.includes('@plugin "@tailwindcss/forms";'))
  errors.push("Plugin Tailwind forms harus tetap aktif.");

const stylesByFile = new Map();
for (const file of styleFiles) {
  const source = await readFile(path.join(styleDir, file), "utf8");
  stylesByFile.set(file, source);
  totalBytes += Buffer.byteLength(source);
  const lines = source.split(/\r?\n/);
  totalLines += lines.at(-1) === "" ? lines.length - 1 : lines.length;
  for (const { pattern, label } of ignoredSelectors) {
    if (pattern.test(source))
      errors.push(`${file}: ${label} ditemukan kembali (${pattern}).`);
  }
}

// Catch stale component CSS after markup is migrated to Tailwind. Only compare
// the first class of a selector; descendant elements often intentionally have
// no class of their own. Explicitly allow variants created by runtime templates.
const sourceFiles = [];
async function collectSourceFiles(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const resolved = path.join(directory, entry.name);
    if (entry.isDirectory()) await collectSourceFiles(resolved);
    else if (/\.(?:js|jsx|mjs)$/.test(entry.name)) sourceFiles.push(resolved);
  }
}
await collectSourceFiles(path.join(root, "src"));
const applicationSource = (
  await Promise.all(sourceFiles.map((file) => readFile(file, "utf8")))
).join("\n");
const knownDynamicClasses = [
  /^home-dataset-art-(?:amber|blue|cyan|emerald|green|rose|violet)$/,
  /^statistics-card-tone-[0-3]$/,
];
for (const [file, source] of stylesByFile) {
  for (const match of source.matchAll(/^\s*\.([A-Za-z_][\w-]*)/gm)) {
    const className = match[1];
    if (ignoredSelectors.some(({ pattern }) => pattern.test(`.${className}`)))
      continue;
    const escapedClass = className.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const classReference = new RegExp(`(?<![\\w-])${escapedClass}(?![\\w-])`);
    if (
      !classReference.test(applicationSource) &&
      !knownDynamicClasses.some((pattern) => pattern.test(className))
    ) {
      errors.push(
        `${file}: selector .${className} tidak lagi dirujuk dari source JS/JSX.`,
      );
    }
  }
}

const button = await readFile(
  path.join(root, "src/components/ui/button.jsx"),
  "utf8",
);
const utils = await readFile(path.join(root, "src/lib/utils.js"), "utf8");
if (
  !button.includes('from "class-variance-authority"') ||
  !button.includes("cva(") ||
  !button.includes("cn(buttonStyles")
) {
  errors.push(
    "Button UI harus mempertahankan pola shadcn/cva dan merge class lewat cn().",
  );
}
if (!utils.includes("twMerge") || !utils.includes("clsx")) {
  errors.push(
    "cn() harus menggabungkan class conditional dan menyelesaikan konflik Tailwind.",
  );
}

// Explicit CSS import order is intentional while legacy styles are being removed:
// changing cascade order can alter rendering without changing React behavior.
const orderedImports = [
  "foundation.css",
  "shared-components.css",
  "public-home-catalog.css",
  "public-pages-motion.css",
  "component-styles.css",
  "overrides.css",
  "quality-pass.css",
  "public-responsive.css",
  "public-layout-stability.css",
];
const actualImports = [
  ...globalCss.matchAll(/@import\s+["']\.\/styles\/([^"']+\.css)["']/g),
].map((match) => match[1]);
if (JSON.stringify(actualImports) !== JSON.stringify(orderedImports)) {
  errors.push(
    "Urutan import CSS berubah; audit visual/regresi diperlukan sebelum mengubah urutan cascade.",
  );
}

if (errors.length) {
  console.error(`Pemeriksaan UI/CSS gagal (${errors.length}):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
process.stdout.write(
  `UI/CSS guard passed: ${styleFiles.length} stylesheets, ${totalLines.toLocaleString("en-US")} lines, ${(totalBytes / 1024).toFixed(1)} KiB; stylesheet imports and source selector references verified; Tailwind/shadcn class merge preserved.\n`,
);
