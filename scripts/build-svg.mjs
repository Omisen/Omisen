#!/usr/bin/env node
// Compila templates/*.svg usando le variabili di variables.md
// e aggiorna i blocchi <!-- var:... --> nel README.
//
// Due tipi di template:
//   templates/nome.svg  → segnaposto {{chiave}} sostituiti, esce assets/nome.svg
//   templates/nome.mjs  → generatore JS per gli SVG con impaginazione calcolata
//                         (a capo automatico, numero variabile di icone...).
//                         Esporta una funzione che riceve { sections, errors }
//                         e restituisce { "file.svg": "<svg ...>" }.
// Nessuna dipendenza: basta Node 18+.

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from "node:fs";
import { join, basename, extname, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const VARS_FILE = process.env.VARS_FILE || "variables.md";
const TEMPLATES_DIR = process.env.TEMPLATES_DIR || "templates";
const OUT_DIR = process.env.OUT_DIR || "assets";
const README_FILE = process.env.README_FILE || "README.md";
const TZ = process.env.DISPLAY_TZ || "Europe/Rome";
const LOCALE = process.env.DISPLAY_LOCALE || "it-IT";

const errors = [];

// ---------- variables.md ----------
function parseVariables(md) {
  const clean = md.replace(/<!--[\s\S]*?-->/g, ""); // ignora i commenti
  const sections = { global: {} };
  let current = "global";
  for (const raw of clean.split(/\r?\n/)) {
    const line = raw.trim();
    const h = line.match(/^##\s+(.+)$/);
    if (h) {
      current = h[1].trim().toLowerCase();
      sections[current] ??= {};
      continue;
    }
    const m = line.match(/^[-*]\s+([\w.-]+)\s*:\s*(.*)$/);
    if (m) {
      const values = m[2].split(/\s+\|\s+/).map((s) => s.trim()).filter(Boolean);
      sections[current][m[1]] = values.length ? values : [""];
    }
  }
  return sections;
}

const now = new Date();
const builtins = {
  updated: [now.toLocaleDateString(LOCALE, { timeZone: TZ, day: "2-digit", month: "short", year: "numeric" })],
  year: [String(now.getFullYear())],
};

function lookup(sections, section, key) {
  if (key.includes(".")) {
    const [s, k] = key.split(".", 2);
    return sections[s.toLowerCase()]?.[k];
  }
  return sections[section]?.[key] ?? sections.global?.[key] ?? builtins[key];
}

const escapeXml = (s) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

const r4 = (n) => Math.round(n * 10000) / 10000;

// ---------- {{rotate:chiave x=.. y=.. dur=3}} ----------
function renderRotate(values, attrString) {
  const attrs = {};
  for (const [, k, v] of attrString.matchAll(/([\w:-]+)=("[^"]*"|'[^']*'|\S+)/g)) {
    attrs[k] = v.replace(/^["']|["']$/g, "");
  }
  const perItem = parseFloat(attrs.dur ?? "3");
  const fadeSec = parseFloat(attrs.fade ?? "0.4");
  delete attrs.dur;
  delete attrs.fade;
  const attrText = Object.entries(attrs).map(([k, v]) => `${k}="${escapeXml(v)}"`).join(" ");

  if (values.length === 1) return `<text ${attrText}>${escapeXml(values[0])}</text>`;

  const n = values.length;
  const total = perItem * n;
  const f = Math.min(fadeSec / total, 1 / (2 * n));
  return values
    .map((v, i) => {
      const a = i / n;
      const b = (i + 1) / n;
      const keyTimes = [0, a, a + f, b - f, b, 1].map(r4).join(";");
      return (
        `<text ${attrText} opacity="0">${escapeXml(v)}` +
        `<animate attributeName="opacity" dur="${r4(total)}s" repeatCount="indefinite" ` +
        `keyTimes="${keyTimes}" values="0;0;1;1;0;0"/></text>`
      );
    })
    .join("\n    ");
}

// ---------- template ----------
function renderTemplate(tpl, sections, section, file) {
  return tpl.replace(/\{\{\s*(rotate:)?([\w.-]+)([^}]*)\}\}/g, (_, rotate, key, rest) => {
    const values = lookup(sections, section, key);
    if (!values) {
      errors.push(`${file}: variabile "${key}" non trovata in ${VARS_FILE}`);
      return "";
    }
    if (rotate) return renderRotate(values, rest);
    return escapeXml(values.join(" · "));
  });
}

function writeIfChanged(path, content) {
  const old = existsSync(path) ? readFileSync(path, "utf8") : null;
  if (old === content) {
    console.log(`  = ${path} (invariato)`);
    return;
  }
  writeFileSync(path, content);
  console.log(`  ✓ ${path} ${old === null ? "(creato)" : "(aggiornato)"}`);
}

// ---------- main ----------
if (!existsSync(VARS_FILE)) {
  console.error(`File ${VARS_FILE} non trovato`);
  process.exit(1);
}
const sections = parseVariables(readFileSync(VARS_FILE, "utf8"));
const outputs = [];

if (existsSync(TEMPLATES_DIR)) {
  mkdirSync(OUT_DIR, { recursive: true });
  for (const file of readdirSync(TEMPLATES_DIR).sort()) {
    const ext = extname(file);
    if (ext === ".svg") {
      const section = basename(file, ".svg").toLowerCase();
      const svg = renderTemplate(readFileSync(join(TEMPLATES_DIR, file), "utf8"), sections, section, file);
      outputs.push([join(OUT_DIR, file), svg]);
    } else if (ext === ".mjs") {
      try {
        const mod = await import(pathToFileURL(resolve(TEMPLATES_DIR, file)).href);
        const files = await mod.default({ sections, errors, builtins });
        for (const [name, svg] of Object.entries(files ?? {})) outputs.push([join(OUT_DIR, name), svg]);
      } catch (e) {
        errors.push(`${file}: ${e.message}`);
      }
    }
  }
}

let readmeOut = null;
if (existsSync(README_FILE)) {
  const readme = readFileSync(README_FILE, "utf8");
  readmeOut = readme.replace(
    /(<!--\s*var:([\w.-]+)\s*-->)[\s\S]*?(<!--\s*\/var\s*-->)/g,
    (_, open, key, close) => {
      const values = lookup(sections, "global", key);
      if (!values) {
        errors.push(`${README_FILE}: variabile "${key}" non trovata in ${VARS_FILE}`);
        return open + close;
      }
      return open + values.join(" · ") + close;
    }
  );
}

if (errors.length) {
  console.error("Errori, nessun file scritto:\n  " + errors.join("\n  "));
  process.exit(1);
}

console.log("Generazione:");
for (const [path, svg] of outputs) writeIfChanged(path, svg);
if (readmeOut !== null) writeIfChanged(README_FILE, readmeOut);
