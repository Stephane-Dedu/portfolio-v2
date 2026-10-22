import { useEffect, useRef } from 'react';
import { prefersReducedMotion } from '../../lib/palette';

// Light to dense. Light glyphs use --faint, dense ones --muted.
const RAMP = ' .:-=+*#%@';
const HEAVY_FROM = 5;
const FONT_SIZE = 13;
const LINE_HEIGHT = 16;
const FONT = `${FONT_SIZE}px "JetBrains Mono Variable", ui-monospace, monospace`;
const FRAME_MS = 40;

// Seeded value noise + fbm (same recipe as the WebGL dither version)
const perm = (() => {
  let seed = 1337;
  const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const p = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [p[i], p[j]] = [p[j], p[i]];
  }
  return Uint8Array.from([...p, ...p]);
})();
const lattice = (x: number, y: number) => perm[perm[x & 255] + (y & 255)] / 255;

function noise(x: number, y: number) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const a = lattice(ix, iy);
  const b = lattice(ix + 1, iy);
  const c = lattice(ix, iy + 1);
  const d = lattice(ix + 1, iy + 1);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}

function fbm(x: number, y: number) {
  let value = 0;
  let amplitude = 0.5;
  for (let i = 0; i < 4; i++) {
    value += amplitude * noise(x, y);
    const nx = 1.6 * x - 1.2 * y;
    y = 1.2 * x + 1.6 * y;
    x = nx;
    amplitude *= 0.5;
  }
  return value;
}

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export default function AsciiClouds() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const reduceMotion = prefersReducedMotion();
    const mouse = { x: -9, y: -9, tx: -9, ty: -9, force: 0, target: 0 };
    const colors = { light: '', heavy: '' };
    const timeOffset = Math.random() * 60;
    const start = performance.now();
    let width = 0;
    let height = 0;
    let charWidth = 7.8;
    let cols = 0;
    let rows = 0;
    let visible = true;
    let raf = 0;
    let lastFrame = 0;
    let time = timeOffset;

    const readColors = () => {
      const css = getComputedStyle(document.documentElement);
      colors.light = css.getPropertyValue('--faint').trim();
      colors.heavy = css.getPropertyValue('--muted').trim();
    };

    const draw = () => {
      if (!width || !height) return;
      ctx.clearRect(0, 0, width, height);
      const t = time * 0.03;
      for (let r = 0; r < rows; r++) {
        // uv in units of the canvas height, y pointing up
        const uy = 1 - ((r + 0.5) * LINE_HEIGHT) / height;
        let light = '';
        let heavy = '';
        for (let c = 0; c < cols; c++) {
          const ux = ((c + 0.5) * charWidth) / height;
          const dx = ux - mouse.x;
          const dy = uy - mouse.y;
          const influence = Math.exp(-(dx * dx + dy * dy) * 14) * mouse.force;
          // Wind: sample closer to the cursor so the clouds look pushed outward
          const px = ux - dx * influence * 1.1;
          const py = (uy - dy * influence * 1.1) * 1.7;
          const wx = fbm(px * 1.2 + t, py * 1.2);
          const wy = fbm(px * 1.2 + 4.1 - t * 0.5, py * 1.2 + 1.7);
          const sx = px * 2 + wx * 0.9 + t * 1.4;
          const sy = py * 2 + wy * 0.9;
          const n = fbm(sx, sy);
          const above = fbm(sx, sy + 0.06);
          // More cover toward the top and the right, keeping the text column calmer
          const cover = 0.42 + (1 - uy) * 0.14 + 0.08 * (1 - smoothstep(0.6, 1.8, ux));
          const body = smoothstep(cover, cover + 0.22, n);
          const shade = smoothstep(-0.03, 0.05, above - n);
          const density = body * (0.35 + 0.65 * shade) * (1 - influence * 0.85);
          const index = Math.min(RAMP.length - 1, Math.floor(density * RAMP.length));
          if (index >= HEAVY_FROM) {
            heavy += RAMP[index];
            light += ' ';
          } else {
            light += RAMP[index];
            heavy += ' ';
          }
        }
        const y = r * LINE_HEIGHT;
        ctx.fillStyle = colors.light;
        ctx.fillText(light, 0, y);
        ctx.fillStyle = colors.heavy;
        ctx.fillText(heavy, 0, y);
      }
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.font = FONT;
      ctx.textBaseline = 'top';
      charWidth = ctx.measureText('M').width || charWidth;
      cols = Math.ceil(width / charWidth);
      rows = Math.ceil(height / LINE_HEIGHT);
      draw();
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (!visible || now - lastFrame < FRAME_MS) return;
      lastFrame = now;
      mouse.x += (mouse.tx - mouse.x) * 0.12;
      mouse.y += (mouse.ty - mouse.y) * 0.12;
      mouse.force += (mouse.target - mouse.force) * 0.08;
      time = timeOffset + (now - start) / 1000;
      draw();
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!height) return;
      const rect = canvas.getBoundingClientRect();
      const inside = event.clientY >= rect.top && event.clientY <= rect.bottom;
      mouse.tx = (event.clientX - rect.left) / height;
      mouse.ty = 1 - (event.clientY - rect.top) / height;
      mouse.target = inside ? 1 : 0;
      if (inside && mouse.force < 0.02) {
        mouse.x = mouse.tx;
        mouse.y = mouse.ty;
      }
    };

    const resizeObserver = new ResizeObserver(resize);
    const visibilityObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
    });
    const themeObserver = new MutationObserver(() => {
      readColors();
      draw();
    });

    let disposed = false;
    readColors();
    // Measure glyphs with the real font, not the fallback
    document.fonts.load(FONT).finally(() => {
      if (disposed) return;
      resize();
      resizeObserver.observe(canvas);
      visibilityObserver.observe(canvas);
      themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
      if (!reduceMotion) {
        window.addEventListener('pointermove', onPointerMove, { passive: true });
        raf = requestAnimationFrame(frame);
      }
    });

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      visibilityObserver.disconnect();
      themeObserver.disconnect();
      window.removeEventListener('pointermove', onPointerMove);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 size-full" />;
}
