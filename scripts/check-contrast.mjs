// Gate de Fase 0: contraste WCAG AA (≥ 4,5:1) dos pares de texto dos tokens de tema.
// Converte oklch → sRGB → luminância relativa. Uso: node scripts/check-contrast.mjs
// Sai com código 1 se qualquer par ficar abaixo de 4,5:1 (borda/input/ring não são texto).

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const cssPath = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "styles.css");
const css = readFileSync(cssPath, "utf8");

const PAIRS = [
  ["background", "foreground"],
  ["card", "card-foreground"],
  ["popover", "popover-foreground"],
  ["primary", "primary-foreground"],
  ["secondary", "secondary-foreground"],
  ["muted", "muted-foreground"],
  ["accent", "accent-foreground"],
  ["destructive", "destructive-foreground"],
  ["success", "success-foreground"],
  ["warning", "warning-foreground"],
  ["info", "info-foreground"],
];

const THEMES = [
  { name: "claro (:root)", block: ":root" },
  { name: "escuro (.dark)", block: ".dark" },
];

function parseTheme(blockStart) {
  const start = css.indexOf(blockStart + " {");
  if (start === -1) throw new Error(`bloco ${blockStart} não encontrado`);
  const end = css.indexOf("}", start);
  const body = css.slice(start, end);
  const vars = {};
  const re = /--([a-z-]+):\s*oklch\(([^)]+)\)/g;
  let m;
  while ((m = re.exec(body)) !== null) {
    const parts = m[2].split("/").map((s) => s.trim());
    if (parts.length > 1) continue; // tokens com alfa (border/input) não são pares de texto
    const [l, c, h] = parts[0].split(/\s+/).map(Number);
    vars[m[1]] = oklchToSrgb(l, c, (h * Math.PI) / 180);
  }
  return vars;
}

// OKLCH → OKLab → linear sRGB (Brettel/W3C CSS Color 4)
function oklchToSrgb(L, C, hRad) {
  const a = C * Math.cos(hRad);
  const b = C * Math.sin(hRad);
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ ** 3;
  const mm = m_ ** 3;
  const s = s_ ** 3;
  let r = 4.0767416621 * l - 3.3077115913 * mm + 0.2309699292 * s;
  let g = -1.2684380046 * l + 2.6097574011 * mm - 0.3413193965 * s;
  let bl = -0.0041960863 * l - 0.7034186147 * mm + 1.707614701 * s;
  return [r, g, bl].map(gamma);
}

function gamma(c) {
  if (c <= 0) return 0;
  if (c >= 1) return 1;
  return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
}

function luminance([r, g, b]) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(fg, bg) {
  const lf = luminance(fg);
  const lb = luminance(bg);
  const [hi, lo] = lf >= lb ? [lf, lb] : [lb, lf];
  return (hi + 0.05) / (lo + 0.05);
}

let failed = false;
for (const theme of THEMES) {
  const vars = parseTheme(theme.block);
  console.log(`\nTema ${theme.name}`);
  for (const [bgVar, fgVar] of PAIRS) {
    if (!vars[bgVar] || !vars[fgVar]) {
      console.log(`  ✗ ${fgVar} sobre ${bgVar}: token ausente`);
      failed = true;
      continue;
    }
    const ratio = contrast(vars[fgVar], vars[bgVar]);
    const ok = ratio >= 4.5;
    if (!ok) failed = true;
    console.log(`  ${ok ? "✓" : "✗"} ${fgVar} sobre ${bgVar}: ${ratio.toFixed(2)}:1`);
  }
}

if (failed) {
  console.error("\nFALHA: algum par de texto ficou abaixo de 4,5:1.");
  process.exit(1);
}
console.log("\nOK: todos os pares de texto ≥ 4,5:1 nos dois temas.");
