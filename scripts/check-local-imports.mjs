import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { builtinModules } from "node:module";

const root = process.cwd();
const sourceRoot = path.join(root, "src");
const files = [];
const errors = [];
const packageJson = JSON.parse(
  await readFile(path.join(root, "package.json"), "utf8"),
);
const declaredPackages = new Set([
  ...Object.keys(packageJson.dependencies || {}),
  ...Object.keys(packageJson.devDependencies || {}),
  ...Object.keys(packageJson.optionalDependencies || {}),
  ...Object.keys(packageJson.peerDependencies || {}),
]);
const nodeBuiltins = new Set(
  builtinModules.flatMap((name) => [name, `node:${name}`]),
);

function checkExternalDependency(from, specifier) {
  if (nodeBuiltins.has(specifier)) return;
  const parts = specifier.split("/");
  const packageName = specifier.startsWith("@")
    ? parts.slice(0, 2).join("/")
    : parts[0];
  if (!declaredPackages.has(packageName)) {
    errors.push(
      `${path.relative(root, from)}: paket eksternal belum dideklarasikan di package.json: ${packageName}`,
    );
  }
}

async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (["node_modules", ".next", ".git"].includes(entry.name)) continue;
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) await walk(file);
    else if (/\.(?:js|jsx|mjs|cjs)$/.test(entry.name)) files.push(file);
  }
}

async function resolveLocalImport(from, specifier) {
  if (specifier.endsWith(".css") || specifier.endsWith(".scss")) {
    const target = path.resolve(path.dirname(from), specifier);
    try {
      return (await stat(target)).isFile() ? target : null;
    } catch {
      return null;
    }
  }
  const base = specifier.startsWith("@/")
    ? path.join(sourceRoot, specifier.slice(2))
    : path.resolve(path.dirname(from), specifier);
  for (const candidate of [
    base,
    `${base}.js`,
    `${base}.jsx`,
    `${base}.mjs`,
    path.join(base, "index.js"),
    path.join(base, "index.jsx"),
    path.join(base, "index.mjs"),
    path.join(base, "index.cjs"),
  ]) {
    try {
      if ((await stat(candidate)).isFile()) return candidate;
    } catch {}
  }
  return null;
}

function hasDefaultExport(source) {
  return (
    /\bexport\s+default\b/.test(source) ||
    /export\s*\{[^}]*\bdefault\s+as\s+[A-Za-z_$][\w$]*[^}]*\}/.test(source) ||
    /module\.exports\s*=/.test(source)
  );
}

function hasNamedExport(source, name) {
  if (name === "default") return hasDefaultExport(source);

  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(
    `export\\s+(?:async\\s+)?(?:function|const|let|var|class)\\s+${escaped}(?:\\b|\\s*[:=])|export\\s*\\{[^}]*\\b${escaped}\\b`,
  ).test(source);
}

for (const directory of [
  sourceRoot,
  path.join(root, "tests"),
  path.join(root, "scripts"),
]) {
  await walk(directory);
}
for (const entry of await readdir(root, { withFileTypes: true })) {
  if (entry.isFile() && /\.(?:js|jsx|mjs|cjs)$/.test(entry.name))
    files.push(path.join(root, entry.name));
}
for (const file of files) {
  const source = await readFile(file, "utf8");
  const imports =
    /import\s+(?:type\s+)?(?:\{([^}]+)\}|([\w$]+)\s*(?:,\s*\{([^}]+)\})?|\*\s+as\s+\w+)\s+from\s+["']([^"']+)["']/g;
  let match;
  while ((match = imports.exec(source))) {
    const specifier = match[4];
    if (!specifier.startsWith(".") && !specifier.startsWith("@/")) {
      checkExternalDependency(file, specifier);
      continue;
    }
    const target = await resolveLocalImport(file, specifier);
    if (!target) {
      errors.push(
        `${path.relative(root, file)}: import lokal tidak ditemukan: ${specifier}`,
      );
      continue;
    }
    if (target.endsWith(".css") || target.endsWith(".scss")) continue;
    const targetSource = await readFile(target, "utf8");
    if (match[2] && !hasDefaultExport(targetSource)) {
      errors.push(
        `${path.relative(root, file)}: ekspor bawaan tidak ditemukan di ${path.relative(root, target)}`,
      );
    }
    const names = (match[1] || match[3] || "")
      .split(",")
      .map((part) =>
        part
          .trim()
          .replace(/^type\s+/, "")
          .split(/\s+as\s+/)[0]
          .trim(),
      )
      .filter(Boolean);
    for (const name of names) {
      if (!hasNamedExport(targetSource, name)) {
        errors.push(
          `${path.relative(root, file)}: ekspor bernama ${name} tidak ditemukan di ${path.relative(root, target)}`,
        );
      }
    }
  }

  // Impor tanpa binding dan dynamic import literal juga harus menunjuk berkas yang ada.
  const bareImports = /(?:^|\n)\s*import\s*["']([^"']+)["']/g;
  while ((match = bareImports.exec(source))) {
    const specifier = match[1];
    if (!specifier.startsWith(".") && !specifier.startsWith("@/")) {
      checkExternalDependency(file, specifier);
      continue;
    }
    if (!(await resolveLocalImport(file, specifier)))
      errors.push(
        `${path.relative(root, file)}: import lokal tidak ditemukan: ${specifier}`,
      );
  }
  const dynamicImports = /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g;
  while ((match = dynamicImports.exec(source))) {
    const specifier = match[1];
    if (!specifier.startsWith(".") && !specifier.startsWith("@/")) {
      checkExternalDependency(file, specifier);
      continue;
    }
    if (!(await resolveLocalImport(file, specifier)))
      errors.push(
        `${path.relative(root, file)}: import dinamis lokal tidak ditemukan: ${specifier}`,
      );
  }
  const reexports = /\bexport\s+(?:\{([^}]+)\}|\*)\s+from\s+["']([^"']+)["']/g;
  while ((match = reexports.exec(source))) {
    const namesToExport = (match[1] || "")
      .split(",")
      .map((part) =>
        part
          .trim()
          .split(/\s+as\s+/)[0]
          .trim(),
      )
      .filter(Boolean);
    const specifier = match[2];
    if (!specifier.startsWith(".") && !specifier.startsWith("@/")) {
      checkExternalDependency(file, specifier);
      continue;
    }
    const target = await resolveLocalImport(file, specifier);
    if (!target) {
      errors.push(
        `${path.relative(root, file)}: target re-ekspor lokal tidak ditemukan: ${specifier}`,
      );
      continue;
    }
    const targetSource = await readFile(target, "utf8");
    for (const name of namesToExport) {
      if (!hasNamedExport(targetSource, name))
        errors.push(
          `${path.relative(root, file)}: ekspor ${name} yang diteruskan tidak ditemukan di ${path.relative(root, target)}`,
        );
    }
  }
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log(
  `Pemeriksaan import, re-ekspor, dan dependensi lulus (${files.length} modul JS/JSX).`,
);
