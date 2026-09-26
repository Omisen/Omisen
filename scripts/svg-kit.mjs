// Funzioni condivise dai generatori in templates/*.mjs
// Nessuna dipendenza: basta Node 18+.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

export const SANS = "-apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,Arial,sans-serif";
export const MONO = "ui-monospace,SFMono-Regular,Menlo,Consolas,monospace";

export const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

// arrotonda per tenere gli SVG leggibili
export const n = (v) => Math.round(v * 100) / 100;

// ---------- tema ----------
const THEME_DEFAULTS = {
  border: "#F8F8FF", // bordi, label, chip
  accent: "#7BCFA4", // icone e parole in evidenza
  text: "#E6EDF3", // testo delle card
  body: "#C9D3DC", // testo della presentazione
  muted: "#8B98A5", // riga attenuata
  card: "#0d1117", // sfondo dei box
  glow: "0.30", // intensità del bagliore del bordo
};

export function theme(sections) {
  const t = { ...THEME_DEFAULTS };
  for (const [k, v] of Object.entries(sections.theme ?? {})) t[k] = v[0];
  t.glow = parseFloat(t.glow);
  return t;
}

export const get = (sec, key, fallback) => sec?.[key] ?? fallback;
export const one = (sec, key, fallback) => sec?.[key]?.[0] ?? fallback;

// ---------- testo ----------
// Stima della larghezza del testo (metriche tipo Helvetica/Arial).
// Serve solo per andare a capo in automatico: non deve essere perfetta.
function charW(c) {
  if ("iljI.,:;'!|".includes(c)) return 0.26;
  if ("ftr()[]  ".includes(c)) return 0.33;
  if ("mwMW".includes(c)) return 0.85;
  if (c >= "A" && c <= "Z") return 0.66;
  return 0.54;
}
const stripMarkup = (s) => s.replace(/^~\s*/, "").replace(/\*{2,3}/g, "");
export const textWidth = (s, size) => [...stripMarkup(s)].reduce((w, c) => w + charW(c), 0) * size;

// Va a capo rispettando la larghezza. Le frasi in **grassetto** non vengono spezzate.
export function wrap(text, maxW, size) {
  const protectedText = text.replace(/\*{2,3}[^*]+\*{2,3}/g, (m) => m.replace(/ /g, " "));
  const lines = [];
  let cur = "";
  for (const word of protectedText.split(/\s+/).filter(Boolean)) {
    const next = cur ? `${cur} ${word}` : word;
    if (cur && textWidth(next, size) > maxW) {
      lines.push(cur);
      cur = word;
    } else cur = next;
  }
  if (cur) lines.push(cur);
  return lines.map((l) => l.replace(/ /g, " "));
}

// Una lista di più valori = righe già decise a mano; un valore solo = a capo automatico.
export function toLines(values, maxW, size) {
  if (!values || !values.length) return [];
  return values.length > 1 ? values : wrap(values[0], maxW, size);
}

// Markup:  ***testo*** = evidenza forte (700)   **testo** = evidenza (600)
//          riga che inizia con "~ " = riga attenuata
export function richLine(line, t) {
  let body = line;
  let muted = false;
  if (/^~\s*/.test(body)) {
    muted = true;
    body = body.replace(/^~\s*/, "");
  }
  const html = esc(body).replace(/\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*/g, (_, strong, bold) =>
    strong !== undefined
      ? `<tspan fill="${t.accent}" font-weight="700">${strong}</tspan>`
      : `<tspan fill="${t.accent}" font-weight="600">${bold}</tspan>`
  );
  return { html, muted };
}

// ---------- bordi ----------
// Rettangolo arrotondato; se gap è indicato lascia un'apertura in alto (per la label).
export function borderPath(w, h, r, gap) {
  const x0 = 1, y0 = 1, x1 = w - 1, y1 = h - 1;
  const start = gap ? `M${n(gap[1])},${y0}` : `M${x0 + r},${y0}`;
  const end = gap ? `H${gap[0]}` : "Z";
  return (
    `${start} H${x1 - r} A${r},${r} 0 0 1 ${x1},${y0 + r} V${y1 - r} A${r},${r} 0 0 1 ${x1 - r},${y1} ` +
    `H${x0 + r} A${r},${r} 0 0 1 ${x0},${y1 - r} V${y0 + r} A${r},${r} 0 0 1 ${x0 + r},${y0} ${end}`
  );
}

export function frame({ w, h, r = 16, pad = 12, t, gap, body }) {
  const d = borderPath(w, h, r, gap);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w + pad * 2}" height="${h + pad * 2}" viewBox="${-pad} ${-pad} ${w + pad * 2} ${h + pad * 2}">
<defs><filter id="g" x="-30%" y="-80%" width="160%" height="260%"><feGaussianBlur stdDeviation="4"/></filter>
<filter id="t" x="-10%" y="-100%" width="120%" height="300%"><feGaussianBlur stdDeviation="3"/></filter></defs>
<rect x="1" y="1" width="${w - 2}" height="${h - 2}" rx="${r}" fill="${t.card}" fill-opacity="0.55"/>
<path d="${d}" fill="none" stroke="${t.border}" stroke-width="3" opacity="${t.glow}" filter="url(#g)"/>
<path d="${d}" fill="none" stroke="${t.border}" stroke-width="1.5" stroke-linecap="round"/>
${body}
</svg>
`;
}

// ---------- icone (Skill Icons) ----------
// Le icone scaricate restano in icons/<id>.svg, così le generazioni successive
// non hanno bisogno della rete. Gli id sono quelli di skillicons.dev (py, ts, rust...).
const ICONS_DIR = process.env.ICONS_DIR || "icons";
const SKILL_ICONS_RAW = "https://raw.githubusercontent.com/tandpfun/skill-icons/main";
let iconIndex = null;

async function loadIconIndex() {
  if (iconIndex) return iconIndex;
  const res = await fetch(`${SKILL_ICONS_RAW}/readme.md`);
  if (!res.ok) throw new Error(`impossibile leggere l'elenco di Skill Icons (HTTP ${res.status})`);
  const md = await res.text();
  iconIndex = {};
  for (const [, id, file] of md.matchAll(/\|\s*`([\w-]+)`\s*\|.*?\/icons\/([\w.-]+\.svg)/g)) iconIndex[id] = file;
  return iconIndex;
}

export async function iconDataUri(id) {
  const path = join(ICONS_DIR, `${id}.svg`);
  if (!existsSync(path)) {
    const index = await loadIconIndex();
    const file = index[id];
    if (!file) throw new Error(`icona "${id}" non esiste su skillicons.dev (controlla l'id)`);
    const res = await fetch(`${SKILL_ICONS_RAW}/icons/${file}`);
    if (!res.ok) throw new Error(`download dell'icona "${id}" fallito (HTTP ${res.status})`);
    mkdirSync(ICONS_DIR, { recursive: true });
    writeFileSync(path, Buffer.from(await res.arrayBuffer()));
    console.log(`  ↓ ${path} (scaricata)`);
  }
  return `data:image/svg+xml;base64,${readFileSync(path).toString("base64")}`;
}
