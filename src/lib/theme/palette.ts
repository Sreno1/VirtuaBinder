// Builds a full Tailwind-style 11-stop shade ramp (50..950) from a handful of
// real "anchor" colors taken from a theme's actual published palette. Missing
// stops are filled in by interpolating hue/saturation/lightness between the
// nearest anchors (or extrapolating past the outermost ones), which keeps the
// ramp faithful to the source theme without hand-picking all 11 shades.

export type Anchor = { shade: number; hex: string };

export const SHADES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;
export type Shade = (typeof SHADES)[number];

type Hsl = { h: number; s: number; l: number };

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  const num = parseInt(full, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function rgbToHsl(r: number, g: number, b: number): Hsl {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l: l * 100 };

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  switch (max) {
    case rn:
      h = (gn - bn) / d + (gn < bn ? 6 : 0);
      break;
    case gn:
      h = (bn - rn) / d + 2;
      break;
    default:
      h = (rn - gn) / d + 4;
  }
  return { h: h * 60, s: s * 100, l: l * 100 };
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const sn = s / 100;
  const ln = l / 100;
  const c = (1 - Math.abs(2 * ln - 1)) * sn;
  const hp = ((h % 360) + 360) % 360 / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let [r, g, b] = [0, 0, 0];
  if (hp < 1) [r, g, b] = [c, x, 0];
  else if (hp < 2) [r, g, b] = [x, c, 0];
  else if (hp < 3) [r, g, b] = [0, c, x];
  else if (hp < 4) [r, g, b] = [0, x, c];
  else if (hp < 5) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const m = ln - c / 2;
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}

function hexToHsl(hex: string): Hsl {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHsl(r, g, b);
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function lerpHue(a: number, b: number, t: number) {
  let delta = b - a;
  if (delta > 180) delta -= 360;
  if (delta < -180) delta += 360;
  return a + delta * t;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/** Builds a full 50..950 hex ramp from a sparse set of real anchor colors. */
export function buildRamp(anchors: Anchor[]): Record<Shade, string> {
  const sorted = [...anchors].sort((a, b) => a.shade - b.shade).map((a) => ({ shade: a.shade, ...hexToHsl(a.hex) }));

  const result = {} as Record<Shade, string>;
  for (const shade of SHADES) {
    const exact = sorted.find((a) => a.shade === shade);
    if (exact) {
      const [r, g, b] = hslToRgb(exact.h, exact.s, exact.l);
      result[shade] = `${r} ${g} ${b}`;
      continue;
    }

    const before = [...sorted].reverse().find((a) => a.shade < shade);
    const after = sorted.find((a) => a.shade > shade);

    let h: number;
    let s: number;
    let l: number;
    if (before && after) {
      const t = (shade - before.shade) / (after.shade - before.shade);
      h = lerpHue(before.h, after.h, t);
      s = lerp(before.s, after.s, t);
      l = lerp(before.l, after.l, t);
    } else if (before && !after) {
      // Extrapolate past the darkest anchor using the slope of the last two anchors.
      const prev = [...sorted].reverse().find((a) => a.shade < before.shade) ?? before;
      const span = before.shade - prev.shade || 1;
      const t = (shade - before.shade) / span;
      h = before.h;
      s = clamp(lerp(prev.s, before.s, 1 + t), 0, 100);
      l = clamp(lerp(prev.l, before.l, 1 + t), 0, 100);
    } else if (after && !before) {
      const next = sorted.find((a) => a.shade > after.shade) ?? after;
      const span = next.shade - after.shade || 1;
      const t = (after.shade - shade) / span;
      h = after.h;
      s = clamp(lerp(next.s, after.s, 1 + t), 0, 100);
      l = clamp(lerp(next.l, after.l, 1 + t), 0, 100);
    } else {
      h = 0;
      s = 0;
      l = 50;
    }

    const [r, g, b] = hslToRgb(h, s, l);
    result[shade] = `${r} ${g} ${b}`;
  }

  return result;
}
