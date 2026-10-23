/**
 * Draws the Sky on a character grid:
 *   1. a faint cell grid on the page colour
 *   2. a wind trail that spreads and fades where the pointer moves or a gust hits
 *   3. clouds rasterised cell by cell: full cells get a tinted block and a glyph
 *      shaded by the light from above, partly covered cells get a light edge glyph
 *
 * Approach inspired by stackedlol/ascii-sharks (grid, supersampled silhouettes,
 * light-shaded glyph ramp, a diffusing wake field). The code here is our own.
 */
import type { Palette, RGB } from '../../../lib/palette';
import type { Sky } from './world';

const LEVELS = 8;
/** Lit tops get sparse glyphs, shadowed bellies dense ones (index 0 → LEVELS-1). */
const BODY_RAMP = ':;-=+*#%';
const RIM_GLYPHS = "~-^'";
const EDGE_GLYPHS = ".',`";
const WAKE_ALPHAS = [0.22, 0.4, 0.6, 0.8];
// Sub-cell sample points, on top of the cell centre
const SUBSAMPLES = [0.25, 0.28, 0.75, 0.28, 0.25, 0.74, 0.75, 0.74];

const NONE = 0;
const BODY = 1;
const RIM = 2;
const EDGE = 3;

const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);

/** Integer hash → [0, 1): spatial-hash primes, then a murmur-style finaliser. */
function hash(x: number, y: number, z: number) {
  let h = Math.imul(x | 0, 73856093) ^ Math.imul(y | 0, 19349663) ^ Math.imul(z | 0, 83492791);
  h = Math.imul(h ^ (h >>> 15), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

const mix = (a: RGB, b: RGB, k: number, alpha = 1) =>
  `rgba(${Math.round((a[0] + (b[0] - a[0]) * k) * 255)},${Math.round((a[1] + (b[1] - a[1]) * k) * 255)},${Math.round(
    (a[2] + (b[2] - a[2]) * k) * 255,
  )},${alpha})`;

export class SkyRenderer {
  private ctx: CanvasRenderingContext2D;
  private grid = document.createElement('canvas');
  private dpr = 1;
  private width = 0;
  private height = 0;
  private cw = 10;
  private ch = 15;
  private cols = 0;
  private rows = 0;
  private fontFamily = 'ui-monospace, monospace';
  private palette: Palette | null = null;

  private flag = new Uint8Array(0);
  private level = new Uint8Array(0);
  private key = new Uint32Array(0);
  private depth = new Float32Array(0);
  private energy = new Float32Array(0);
  private energyTmp = new Float32Array(0);

  private style = {
    grid: '',
    fill: [] as string[],
    glyph: [] as string[],
    rim: '',
    edge: '',
    accent: '',
    wake: [] as string[],
  };

  constructor(private canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('2D canvas unavailable');
    this.ctx = ctx;
  }

  setFontFamily(family: string) {
    if (family) this.fontFamily = family;
  }

  /** Colours follow the theme: lit tops lighter than bellies, in light and dark mode. */
  setPalette(palette: Palette) {
    this.palette = palette;
    const { bg, ink, accent, dark } = palette;
    const s = this.style;
    s.grid = mix(bg, ink, dark ? 0.05 : 0.045);
    s.fill = [];
    s.glyph = [];
    for (let l = 0; l < LEVELS; l++) {
      const shadow = l / (LEVELS - 1);
      s.fill.push(mix(bg, ink, dark ? 0.13 - 0.09 * shadow : 0.02 + 0.08 * shadow));
      s.glyph.push(mix(bg, ink, dark ? 0.5 - 0.22 * shadow : 0.22 + 0.28 * shadow));
    }
    s.rim = mix(bg, ink, dark ? 0.62 : 0.24);
    s.edge = mix(bg, ink, dark ? 0.32 : 0.28);
    s.accent = mix(accent, accent, 0);
    s.wake = WAKE_ALPHAS.map((a) => mix(accent, accent, 0, a));
    this.paintGrid();
  }

  resize(width: number, height: number, dpr: number) {
    this.width = width;
    this.height = height;
    this.dpr = dpr;
    this.cw = clamp(Math.round(width / 150), 8, 12);
    this.ch = Math.round(this.cw * 1.5);
    this.cols = Math.ceil(width / this.cw);
    this.rows = Math.ceil(height / this.ch);
    this.canvas.width = this.grid.width = Math.round(width * dpr);
    this.canvas.height = this.grid.height = Math.round(height * dpr);
    const n = this.cols * this.rows;
    this.flag = new Uint8Array(n);
    this.level = new Uint8Array(n);
    this.key = new Uint32Array(n);
    this.depth = new Float32Array(n);
    this.energy = new Float32Array(n);
    this.energyTmp = new Float32Array(n);
    this.paintGrid();
  }

  /** Page colour with a faint cell grid, snapped to device pixels. Painted once per resize or theme change. */
  private paintGrid() {
    const g = this.grid.getContext('2d');
    if (!g || !this.palette || !this.cols) return;
    const { width: W, height: H, dpr, cw, ch } = this;
    const [r, gr, b] = this.palette.bg;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = `rgb(${Math.round(r * 255)},${Math.round(gr * 255)},${Math.round(b * 255)})`;
    g.fillRect(0, 0, this.grid.width, this.grid.height);
    g.strokeStyle = this.style.grid;
    g.lineWidth = 1;
    g.beginPath();
    for (let c = 0; c <= this.cols; c++) {
      const x = Math.round(c * cw * dpr) + 0.5;
      g.moveTo(x, 0);
      g.lineTo(x, H * dpr);
    }
    for (let row = 0; row <= this.rows; row++) {
      const y = Math.round(row * ch * dpr) + 0.5;
      g.moveTo(0, y);
      g.lineTo(W * dpr, y);
    }
    g.stroke();
  }

  render(sky: Sky, dt: number) {
    const { ctx, dpr, cols, ch } = this;
    if (!cols || !this.palette) return;

    this.feedWake(sky);
    this.diffuse(dt);
    this.rasterize(sky);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(this.grid, 0, 0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.font = `600 ${Math.round(ch * 0.72)}px ${this.fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    this.drawWake();
    this.drawClouds(sky.time);
  }

  // ── wind trail ──────────────────────────────────────────────────────

  private stamp(x: number, y: number, radius: number, amount: number) {
    const { cols, rows, cw, ch, energy } = this;
    const c0 = Math.floor(x / cw);
    const r0 = Math.floor(y / ch);
    for (let r = r0 - radius; r <= r0 + radius; r++) {
      for (let c = c0 - radius; c <= c0 + radius; c++) {
        if (c < 0 || r < 0 || c >= cols || r >= rows) continue;
        const d = Math.hypot(c - c0, (r - r0) * 1.5);
        if (d > radius + 0.5) continue;
        const i = r * cols + c;
        energy[i] = Math.min(1.4, energy[i] + amount * (1 - d / (radius + 1)));
      }
    }
  }

  private feedWake(sky: Sky) {
    const { pointer } = sky;
    if (pointer.active && pointer.moved > 0.02) this.stamp(pointer.x, pointer.y, 1, 0.15 + pointer.moved * 0.6);
    for (const gust of sky.gusts) this.stamp(gust.x, gust.y, 5, 1.2);
    sky.gusts.length = 0;
  }

  /** Blur and decay, so the trail spreads like a breath of wind and fades. */
  private diffuse(dt: number) {
    const { cols, rows, energy, energyTmp: tmp } = this;
    const decay = Math.exp(-dt * 1.3);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const i = r * cols + c;
        const left = c > 0 ? energy[i - 1] : energy[i];
        const right = c < cols - 1 ? energy[i + 1] : energy[i];
        const up = r > 0 ? energy[i - cols] : energy[i];
        const down = r < rows - 1 ? energy[i + cols] : energy[i];
        // Wind carries the trail slightly to the right
        tmp[i] = (energy[i] * 4 + left * 1.3 + right * 0.7 + up + down) * 0.125 * decay;
      }
    }
    this.energy = tmp;
    this.energyTmp = energy;
  }

  private drawWake() {
    const { ctx, energy, flag, cols, cw, ch, style } = this;
    for (let i = 0; i < energy.length; i++) {
      const e = energy[i];
      if (e < 0.18 || flag[i] === BODY || flag[i] === RIM) continue;
      ctx.fillStyle = style.wake[clamp(Math.floor(e * 3.2), 0, WAKE_ALPHAS.length - 1)];
      ctx.fillText(e > 0.8 ? '~' : e > 0.45 ? '-' : '·', (i % cols) * cw + cw / 2, ((i / cols) | 0) * ch + ch / 2 + 1);
    }
  }

  // ── clouds ──────────────────────────────────────────────────────────

  /**
   * Supersample every cell around each cloud against its puffs, far clouds first so
   * nearer ones overwrite them. Glyph keys are taken in cloud coordinates, so the
   * texture travels with the cloud instead of crawling across the grid.
   */
  private rasterize(sky: Sky) {
    const { flag, level, key, depth, cols, rows, cw, ch } = this;
    flag.fill(NONE);
    const t = sky.time;
    const px: number[] = [];
    const py: number[] = [];
    const pr2: number[] = [];

    for (const cloud of sky.clouds) {
      px.length = py.length = pr2.length = 0;
      let maxR = 0;
      for (const puff of cloud.puffs) {
        const r = puff.r * (1 + 0.045 * Math.sin(t * 0.4 + puff.phase));
        px.push(cloud.x + puff.dx);
        py.push(cloud.y + puff.dy);
        pr2.push(r * r);
        maxR = Math.max(maxR, r);
      }
      const inside = (x: number, y: number) => {
        // Flat base, like a cumulus over a warm ground
        if (y > cloud.y) return false;
        for (let k = 0; k < px.length; k++) {
          const dx = x - px[k];
          const dy = (y - py[k]) * 1.12;
          if (dx * dx + dy * dy < pr2[k]) return true;
        }
        return false;
      };
      /** 1 at the sunlit top-left of a bump, 0 deep in its shadow. */
      const light = (x: number, y: number) => {
        let best = 0;
        for (let k = 0; k < px.length; k++) {
          const dx = x - px[k];
          const dy = (y - py[k]) * 1.12;
          const d2 = dx * dx + dy * dy;
          if (d2 >= pr2[k]) continue;
          const r = Math.sqrt(pr2[k]);
          // Surface facing up and slightly left catches the light
          const facing = (-dy * 0.85 - dx * 0.35) / r;
          best = Math.max(best, 0.5 + 0.5 * facing);
        }
        return best;
      };

      const c0 = Math.max(0, Math.floor((cloud.x - cloud.width / 2 - maxR) / cw));
      const c1 = Math.min(cols - 1, Math.floor((cloud.x + cloud.width / 2 + maxR) / cw));
      const r0 = Math.max(0, Math.floor((cloud.y - cloud.height * 1.3 - maxR) / ch));
      const r1 = Math.min(rows - 1, Math.floor(cloud.y / ch));

      for (let r = r0; r <= r1; r++) {
        for (let c = c0; c <= c1; c++) {
          const x = c * cw;
          const y = r * ch;
          const cx = x + cw / 2;
          const cy = y + ch / 2;
          const centre = inside(cx, cy);
          let hits = centre ? 1 : 0;
          for (let s = 0; s < SUBSAMPLES.length; s += 2) {
            if (inside(x + SUBSAMPLES[s] * cw, y + SUBSAMPLES[s + 1] * ch)) hits++;
          }
          if (hits === 0) continue;
          const i = r * cols + c;
          // A near cloud's soft edge should not erase a far cloud's body
          if (hits < 3 && (flag[i] === BODY || flag[i] === RIM)) continue;

          key[i] = (hash(Math.round((cx - cloud.x) / cw), Math.round((cy - cloud.y) / ch), cloud.id) * 4294967295) >>> 0;
          depth[i] = cloud.depth;
          if (!centre || hits < 3) {
            flag[i] = EDGE;
            continue;
          }
          // Lit from above: each bump has its own light, and the base sits in shadow
          const h = clamp((cloud.y - cy) / cloud.height, 0, 1);
          const lit = 0.55 * light(cx, cy) + 0.45 * h;
          flag[i] = inside(cx, cy - ch) ? BODY : RIM;
          level[i] = clamp(Math.round((1 - lit) * (LEVELS - 1)), 0, LEVELS - 1);
        }
      }
    }
  }

  private drawClouds(t: number) {
    const { ctx, flag, level, key, depth, cols, cw, ch, style } = this;
    for (let i = 0; i < flag.length; i++) {
      const f = flag[i];
      if (f === NONE) continue;
      const x = (i % cols) * cw;
      const y = ((i / cols) | 0) * ch;
      const k = key[i];
      // Far clouds sit closer to the sky colour
      ctx.globalAlpha = 0.42 + 0.58 * depth[i];

      if (f === EDGE) {
        ctx.fillStyle = style.edge;
        ctx.fillText(EDGE_GLYPHS[k % EDGE_GLYPHS.length], x + cw / 2, y + ch / 2 + 1);
        continue;
      }

      const l = level[i];
      ctx.fillStyle = style.fill[l];
      ctx.fillRect(x + 1, y + 1, cw - 1, ch - 1);

      // A few glyphs catch the accent colour on a slow, staggered clock
      const tick = Math.floor(t * 1.4 + (k % 991) / 90);
      const glint = hash(k, tick, 5) < 0.025;
      if (f === RIM) {
        ctx.fillStyle = glint ? style.accent : style.rim;
        ctx.fillText(RIM_GLYPHS[(k >>> 8) % RIM_GLYPHS.length], x + cw / 2, y + ch / 2 + 1);
      } else {
        const jitter = ((k >>> 4) % 3) - 1;
        ctx.fillStyle = glint ? style.accent : style.glyph[l];
        ctx.fillText(BODY_RAMP[clamp(l + jitter, 0, BODY_RAMP.length - 1)], x + cw / 2, y + ch / 2 + 1);
      }
    }
    ctx.globalAlpha = 1;
  }
}

