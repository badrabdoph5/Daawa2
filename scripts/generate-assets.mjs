import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);

function loadPng() {
  const candidates = [
    "pngjs",
    "/Users/mac/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/pngjs",
  ];
  for (const candidate of candidates) {
    try {
      return require(candidate).PNG;
    } catch {
      // Try next package root.
    }
  }
  throw new Error("pngjs is required. Run `pnpm install` first.");
}

const PNG = loadPng();
const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const templates = [
  ["royal-envelope", "#efe3ca", "#9d7a36", "#fff9ee", "envelope"],
];

function hex(value) {
  const clean = value.replace("#", "");
  return [
    Number.parseInt(clean.slice(0, 2), 16),
    Number.parseInt(clean.slice(2, 4), 16),
    Number.parseInt(clean.slice(4, 6), 16),
  ];
}

function mix(a, b, amount) {
  return a.map((value, index) => Math.round(value * (1 - amount) + b[index] * amount));
}

function shade(color, amount) {
  return mix(color, amount > 0 ? [255, 255, 255] : [0, 0, 0], Math.abs(amount));
}

function blend(png, x, y, color, alpha = 1) {
  if (x < 0 || y < 0 || x >= png.width || y >= png.height) return;
  const idx = (Math.floor(png.width * y) + Math.floor(x)) << 2;
  const inv = 1 - alpha;
  png.data[idx] = png.data[idx] * inv + color[0] * alpha;
  png.data[idx + 1] = png.data[idx + 1] * inv + color[1] * alpha;
  png.data[idx + 2] = png.data[idx + 2] * inv + color[2] * alpha;
  png.data[idx + 3] = 255;
}

function fillRect(png, x, y, w, h, color, alpha = 1) {
  for (let yy = Math.max(0, y); yy < Math.min(png.height, y + h); yy += 1) {
    for (let xx = Math.max(0, x); xx < Math.min(png.width, x + w); xx += 1) {
      blend(png, xx, yy, color, alpha);
    }
  }
}

function circle(png, cx, cy, r, color, alpha = 1, ring = false) {
  const r2 = r * r;
  const inner = (r - 4) * (r - 4);
  for (let y = cy - r; y <= cy + r; y += 1) {
    for (let x = cx - r; x <= cx + r; x += 1) {
      const d = (x - cx) ** 2 + (y - cy) ** 2;
      if (ring ? d <= r2 && d >= inner : d <= r2) blend(png, x, y, color, alpha);
    }
  }
}

function line(png, x1, y1, x2, y2, color, alpha = 1, thickness = 2) {
  const steps = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));
  for (let i = 0; i <= steps; i += 1) {
    const t = i / Math.max(1, steps);
    const x = Math.round(x1 + (x2 - x1) * t);
    const y = Math.round(y1 + (y2 - y1) * t);
    fillRect(png, x - Math.floor(thickness / 2), y - Math.floor(thickness / 2), thickness, thickness, color, alpha);
  }
}

function frame(png, x, y, w, h, color, alpha = 1, t = 3) {
  fillRect(png, x, y, w, t, color, alpha);
  fillRect(png, x, y + h - t, w, t, color, alpha);
  fillRect(png, x, y, t, h, color, alpha);
  fillRect(png, x + w - t, y, t, h, color, alpha);
}

function baseImage(width, height, primary, accent, ink) {
  const png = new PNG({ width, height });
  const p = hex(primary);
  const a = hex(accent);
  const i = hex(ink);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const radial = Math.hypot(x - width * 0.78, y - height * 0.24) / Math.hypot(width, height);
      const diagonal = (x / width + y / height) / 2;
      const color = mix(mix(p, shade(a, 0.35), diagonal * 0.42), i, Math.max(0, 0.22 - radial) * 0.18);
      const noise = ((x * 31 + y * 17) % 19) - 9;
      const idx = (width * y + x) << 2;
      png.data[idx] = Math.max(0, Math.min(255, color[0] + noise));
      png.data[idx + 1] = Math.max(0, Math.min(255, color[1] + noise));
      png.data[idx + 2] = Math.max(0, Math.min(255, color[2] + noise));
      png.data[idx + 3] = 255;
    }
  }
  return png;
}

function motif(png, kind, accent, ink) {
  const a = hex(accent);
  const i = hex(ink);
  const paper = shade(hex("#ffffff"), -0.03);
  fillRect(png, 62, 74, png.width - 124, png.height - 148, paper, 0.48);
  frame(png, 62, 74, png.width - 124, png.height - 148, a, 0.45, 3);
  const cx = png.width / 2;
  const cy = png.height / 2;

  if (kind === "envelope") {
    frame(png, 118, 250, 404, 280, a, 0.75, 4);
    line(png, 118, 250, cx, 420, a, 0.72, 4);
    line(png, 522, 250, cx, 420, a, 0.72, 4);
    line(png, 118, 530, 278, 386, a, 0.52, 3);
    line(png, 522, 530, 362, 386, a, 0.52, 3);
    circle(png, cx, 420, 42, a, 0.34);
  } else if (kind === "cinema") {
    fillRect(png, 100, 118, 440, 564, i, 0.16);
    line(png, 120, 160, 520, 160, a, 0.8, 3);
    line(png, 120, 640, 520, 640, a, 0.8, 3);
    for (let x = 120; x < 500; x += 48) fillRect(png, x, 126, 22, 22, a, 0.65);
  } else if (kind === "arch") {
    circle(png, cx, 340, 188, a, 0.1, true);
    line(png, 132, 620, 132, 335, a, 0.7, 5);
    line(png, 508, 620, 508, 335, a, 0.7, 5);
    circle(png, cx, 335, 188, a, 0.7, true);
  } else if (kind === "palace" || kind === "columns") {
    line(png, 120, 186, 520, 186, a, 0.75, 5);
    line(png, 112, 590, 528, 590, a, 0.75, 5);
    for (const x of [160, 256, 384, 480]) line(png, x, 186, x, 590, a, 0.62, 7);
    line(png, 112, 186, 320, 104, a, 0.72, 4);
    line(png, 528, 186, 320, 104, a, 0.72, 4);
  } else if (kind === "stars" || kind === "orbit") {
    circle(png, cx, cy, 180, a, 0.6, true);
    for (let k = 0; k < 26; k += 1) circle(png, 90 + ((k * 97) % 460), 90 + ((k * 53) % 580), 2 + (k % 4), a, 0.72);
    line(png, 130, 450, 510, 270, a, 0.45, 2);
  } else if (kind === "petals" || kind === "leaf") {
    for (let k = 0; k < 18; k += 1) {
      const angle = (Math.PI * 2 * k) / 18;
      circle(png, cx + Math.cos(angle) * 150, cy + Math.sin(angle) * 210, 34, a, 0.18);
      line(png, cx, cy, cx + Math.cos(angle) * 230, cy + Math.sin(angle) * 260, a, 0.38, 2);
    }
    circle(png, cx, cy, 90, a, 0.24);
  } else if (kind === "tie") {
    line(png, 260, 150, 380, 150, a, 0.8, 5);
    line(png, 260, 150, 302, 246, a, 0.8, 5);
    line(png, 380, 150, 338, 246, a, 0.8, 5);
    line(png, 302, 246, 230, 552, a, 0.8, 5);
    line(png, 338, 246, 410, 552, a, 0.8, 5);
    line(png, 230, 552, 320, 638, a, 0.8, 5);
    line(png, 410, 552, 320, 638, a, 0.8, 5);
  } else if (kind === "fabric" || kind === "dune") {
    for (let row = 0; row < 5; row += 1) {
      let previous = [70, 240 + row * 88];
      for (let x = 90; x < 580; x += 18) {
        const y = 240 + row * 88 + Math.sin(x / 42 + row) * 42;
        line(png, previous[0], previous[1], x, y, a, 0.56, 4);
        previous = [x, y];
      }
    }
  } else if (kind === "post" || kind === "grid" || kind === "mag") {
    frame(png, 116, 160, 408, 470, a, 0.72, 4);
    line(png, 116, 300, 524, 300, a, 0.44, 3);
    line(png, 302, 160, 302, 630, a, 0.44, 3);
    circle(png, 446, 245, 50, a, 0.28, true);
  } else if (kind === "crystal") {
    const points = [[320, 94], [496, 254], [428, 554], [320, 646], [212, 554], [144, 254]];
    for (let p = 0; p < points.length; p += 1) {
      const next = points[(p + 1) % points.length];
      line(png, points[p][0], points[p][1], next[0], next[1], a, 0.72, 4);
      line(png, points[p][0], points[p][1], 320, 360, a, 0.38, 2);
    }
  } else if (kind === "panel") {
    frame(png, 100, 112, 220, 548, a, 0.65, 4);
    frame(png, 320, 182, 220, 408, a, 0.5, 4);
    fillRect(png, 140, 170, 124, 10, a, 0.45);
    fillRect(png, 360, 250, 124, 10, a, 0.45);
  } else if (kind === "ribbon") {
    frame(png, 112, 270, 416, 292, a, 0.62, 4);
    line(png, 320, 270, 320, 562, a, 0.5, 4);
    circle(png, 270, 205, 54, a, 0.28);
    circle(png, 370, 205, 54, a, 0.28);
  } else if (kind === "moon") {
    circle(png, 330, 350, 175, a, 0.25);
    circle(png, 390, 300, 170, hex("#ffffff"), 0.32);
    circle(png, cx, cy, 220, a, 0.42, true);
  } else {
    circle(png, cx, cy, 190, a, 0.48, true);
  }

  fillRect(png, 160, png.height - 168, png.width - 320, 8, a, 0.56);
  fillRect(png, 218, png.height - 126, png.width - 436, 5, i, 0.22);
}

async function savePng(path, width, height, palette, kind) {
  const png = baseImage(width, height, palette[0], palette[1], palette[2]);
  motif(png, kind, palette[1], palette[2]);
  await writeFile(path, PNG.sync.write(png));
}

await mkdir(join(root, "public", "assets", "templates"), { recursive: true });
await mkdir(join(root, "public", "assets", "brand"), { recursive: true });

for (const [slug, primary, accent, ink, kind] of templates) {
  await savePng(join(root, "public", "assets", "templates", `${slug}.png`), 640, 800, [primary, accent, ink], kind);
}

await savePng(join(root, "public", "assets", "brand", "hero-luxury.png"), 1440, 960, ["#f8ead4", "#bd8f3f", "#2b2118"], "envelope");
await savePng(join(root, "public", "assets", "brand", "couple-royal.png"), 900, 960, ["#f4e5ce", "#bd8f3f", "#2b2118"], "palace");

const accentVisuals = [
  ["champagne-rings", "#f8ead4", "#bd8f3f", "#2b2118", "envelope"],
];

await Promise.all(
  accentVisuals.map(([name, primary, accent, ink, kind]) =>
    savePng(join(root, "public", "assets", "brand", `${name}.png`), 420, 420, [primary, accent, ink], kind),
  ),
);

console.log(`Generated ${templates.length} template previews and brand assets.`);
