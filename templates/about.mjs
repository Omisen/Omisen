// Genera assets/about-ghost.svg (desktop, 2 colonne) e assets/about-ghost-mobile.svg (1 colonna)
// dalla sezione "## about" di variables.md.

import { SANS, MONO, esc, n, theme, get, one, toLines, richLine, textWidth, frame } from "../scripts/svg-kit.mjs";

const LAYOUTS = {
  "about-ghost.svg": { w: 760, pad: 30, introY: 54, cols: 2, th: 94, gapX: 16, gapY: 14, bottom: 20, introKey: "intro" },
  "about-ghost-mobile.svg": { w: 440, pad: 24, introY: 48, cols: 1, th: 88, gapX: 0, gapY: 12, bottom: 26, introKey: "intro_mobile" },
};

// Le quattro card, nell'ordine in cui appaiono. "chips" = valori mostrati come pillole.
const TILES = [
  { key: "currently", label: "CURRENTLY", icon: "pulse" },
  { key: "learning", label: "LEARNING", icon: "sprout", chips: true },
  { key: "interested", label: "INTERESTED IN", icon: "graph" },
  { key: "goal", label: "GOAL", icon: "target" },
];

const INTRO_SIZE = 15.5;
const INTRO_STEP = 25;
const TILE_SIZE = 14;

const ICONS = {
  pulse: (x, y, c) =>
    `<circle cx="${x}" cy="${y}" r="4" fill="${c}"/>` +
    `<circle cx="${x}" cy="${y}" r="4" fill="none" stroke="${c}" stroke-width="1.5">` +
    `<animate attributeName="r" values="4;12" dur="2s" repeatCount="indefinite"/>` +
    `<animate attributeName="opacity" values="0.9;0" dur="2s" repeatCount="indefinite"/></circle>`,
  sprout: (x, y, c) =>
    `<path d="M${x},${y + 9} V${y - 1}" stroke="${c}" stroke-width="1.6" stroke-linecap="round"/>` +
    `<path d="M${x},${y + 1} C${x - 9},${y + 1} ${x - 10},${y - 7} ${x - 9},${y - 9} C${x - 3},${y - 9} ${x},${y - 5} ${x},${y + 1}Z" fill="none" stroke="${c}" stroke-width="1.5"/>` +
    `<path d="M${x},${y - 2} C${x + 8},${y - 2} ${x + 9},${y - 9} ${x + 8},${y - 11} C${x + 3},${y - 11} ${x},${y - 8} ${x},${y - 2}Z" fill="${c}" fill-opacity="0.25" stroke="${c}" stroke-width="1.5"/>`,
  graph: (x, y, c) => {
    const p = [[x - 8, y + 6], [x + 8, y + 6], [x, y - 8]];
    const lines = [[0, 1], [1, 2], [2, 0]]
      .map(([a, b]) => `<line x1="${p[a][0]}" y1="${p[a][1]}" x2="${p[b][0]}" y2="${p[b][1]}" stroke="${c}" stroke-width="1.3" stroke-opacity="0.7"/>`)
      .join("");
    return lines + p.map(([px, py]) => `<circle cx="${px}" cy="${py}" r="3.2" fill="#0d1117" stroke="${c}" stroke-width="1.5"/>`).join("");
  },
  target: (x, y, c) =>
    `<circle cx="${x}" cy="${y}" r="10" fill="none" stroke="${c}" stroke-width="1.4" stroke-opacity="0.6"/>` +
    `<circle cx="${x}" cy="${y}" r="6" fill="none" stroke="${c}" stroke-width="1.4"/>` +
    `<circle cx="${x}" cy="${y}" r="2.2" fill="${c}"/>`,
};

function tile(spec, sec, t, tx, ty, tw, th, errors, file) {
  const c = t.accent;
  const cy = ty + th / 2;
  const lx = tx + 70;
  const label = one(sec, `${spec.key}_label`, spec.label).toUpperCase();
  let out =
    `<rect x="${n(tx)}" y="${ty}" width="${n(tw)}" height="${th}" rx="12" fill="${t.border}" fill-opacity="0.04" stroke="${t.border}" stroke-opacity="0.28"/>` +
    `<rect x="${n(tx)}" y="${ty + 18}" width="2.5" height="${th - 36}" rx="1.25" fill="${t.border}"/>` +
    `<circle cx="${n(tx + 36)}" cy="${cy}" r="19" fill="${c}" fill-opacity="0.08" stroke="${c}" stroke-opacity="0.35"/>` +
    ICONS[spec.icon](n(tx + 36), cy, c) +
    `<text x="${n(lx)}" y="${ty + 27}" font-family="${MONO}" font-size="11" font-weight="600" letter-spacing="2" fill="${t.border}">${esc(label)}</text>`;

  const values = get(sec, spec.key, []);
  if (spec.chips) {
    let cx = lx;
    for (const chip of values) {
      const cw = chip.length * 8.2 + 22;
      out +=
        `<rect x="${n(cx)}" y="${ty + 42}" width="${n(cw)}" height="28" rx="14" fill="${t.border}" fill-opacity="0.10" stroke="${t.border}" stroke-opacity="0.55"/>` +
        `<text x="${n(cx + cw / 2)}" y="${ty + 60.5}" text-anchor="middle" font-family="${MONO}" font-size="13" font-weight="600" fill="${t.text}">${esc(chip)}</text>`;
      cx += cw + 8;
    }
    if (cx - 8 > tx + tw - 12) errors.push(`${file}: troppe pillole in "${spec.key}", non entrano nella card`);
    return out;
  }

  const lines = toLines(values, tw - 70 - 16, TILE_SIZE);
  if (lines.length > 2) errors.push(`${file}: il testo di "${spec.key}" occupa più di 2 righe, accorcialo`);
  lines.forEach((l, j) => {
    if (textWidth(l, TILE_SIZE) > tw - 70 - 8) errors.push(`${file}: la riga "${l}" di "${spec.key}" è troppo lunga`);
    out += `<text x="${n(lx)}" y="${ty + 51 + j * 20}" font-family="${SANS}" font-size="${TILE_SIZE}" fill="${t.text}">${esc(l)}</text>`;
  });
  return out;
}

function build(file, L, sec, t, errors) {
  const introValues = get(sec, L.introKey) ?? get(sec, "intro", []);
  // se manca intro_mobile, il testo desktop viene rimandato a capo in automatico
  const intro = L.introKey === "intro_mobile" && !sec.intro_mobile ? [introValues.join(" ")] : introValues;
  const lines = toLines(intro, L.w - L.pad * 2, INTRO_SIZE);

  const tspans = lines
    .map((line, i) => {
      const { html, muted } = richLine(line, t);
      return `<tspan x="${L.pad}" y="${L.introY + i * INTRO_STEP}"${muted ? ` fill="${t.muted}"` : ""}>${html}</tspan>`;
    })
    .join("\n");
  const introSvg = `<text font-family="${SANS}" font-size="${INTRO_SIZE}" fill="${t.body}">\n${tspans}\n</text>`;

  const dividerY = L.introY + (lines.length - 1) * INTRO_STEP + 23;
  const divider = `<line x1="${L.pad}" y1="${dividerY}" x2="${L.w - L.pad}" y2="${dividerY}" stroke="${t.border}" stroke-opacity="0.18"/>`;

  const tilesY = dividerY + 18;
  const tw = (L.w - L.pad * 2 - (L.cols - 1) * L.gapX) / L.cols;
  const rows = Math.ceil(TILES.length / L.cols);
  const tiles = TILES.map((spec, i) => {
    const tx = L.pad + (i % L.cols) * (tw + L.gapX);
    const ty = tilesY + Math.floor(i / L.cols) * (L.th + L.gapY);
    return tile(spec, sec, t, tx, ty, tw, L.th, errors, file);
  }).join("");

  const h = tilesY + rows * L.th + (rows - 1) * L.gapY + L.bottom;
  return frame({ w: L.w, h, t, body: introSvg + divider + tiles });
}

export default function ({ sections, errors }) {
  const sec = sections.about;
  if (!sec) {
    errors.push('variables.md: manca la sezione "## about"');
    return {};
  }
  const t = theme(sections);
  const out = {};
  for (const [file, L] of Object.entries(LAYOUTS)) out[file] = build(file, L, sec, t, errors);
  return out;
}
