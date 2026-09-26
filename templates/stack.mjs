// Genera un box per ogni sezione "## stack-<nome>" di variables.md
// → assets/stack-<nome>-ghost.svg (es. stack-backend → stack-backend-ghost.svg)

import { MONO, esc, n, theme, get, one, frame, iconDataUri } from "../scripts/svg-kit.mjs";

const SIZE = 48; // lato di un'icona
const GAP = 14; // spazio tra le icone
const PAD_X = 26;
const PAD_Y = 26;
const LABEL_SIZE = 13;
const LABEL_SPACING = 2.2;

export default async function ({ sections, errors }) {
  const t = theme(sections);
  const out = {};

  for (const [name, sec] of Object.entries(sections)) {
    if (!name.startsWith("stack-")) continue;
    const file = `${name}-ghost.svg`;
    const label = one(sec, "label", name.slice(6)).toUpperCase();
    const ids = get(sec, "icons", []);
    if (!ids.length) {
      errors.push(`variables.md: la sezione "## ${name}" non ha icone`);
      continue;
    }

    const images = [];
    for (const [i, id] of ids.entries()) {
      try {
        const href = await iconDataUri(id.toLowerCase());
        images.push(`<image x="${PAD_X + i * (SIZE + GAP)}" y="${PAD_Y}" width="${SIZE}" height="${SIZE}" href="${href}"/>`);
      } catch (e) {
        errors.push(`${file}: ${e.message}`);
      }
    }

    const w = PAD_X * 2 + ids.length * SIZE + (ids.length - 1) * GAP;
    const h = PAD_Y * 2 + SIZE;
    // apertura nel bordo superiore dove si appoggia la label
    const labelW = label.length * (LABEL_SIZE * 0.6 + LABEL_SPACING);
    const gap = [18, 18 + labelW + 14];
    const labelAttrs = `x="25" y="${n(1 + LABEL_SIZE * 0.36)}" font-family="${MONO}" font-size="${LABEL_SIZE}" font-weight="600" letter-spacing="${LABEL_SPACING}" fill="${t.border}"`;
    const body =
      `<text ${labelAttrs} opacity="${n(t.glow + 0.2)}" filter="url(#t)">${esc(label)}</text>\n` +
      `<text ${labelAttrs}>${esc(label)}</text>\n` +
      images.join("");

    out[file] = frame({ w, h, t, gap, body });
  }
  return out;
}
