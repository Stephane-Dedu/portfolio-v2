/**
 * Runs the Sky on a canvas: fixed-timestep loop, resize, pointer and gusts,
 * pause when off-screen, theme changes and prefers-reduced-motion.
 */
import { readPalette } from '../../../lib/palette';
import { SkyRenderer } from './renderer';
import { Sky } from './world';

const STEP = 1 / 60;
const MAX_STEPS = 4;

export class SkyEngine {
  private sky = new Sky();
  private renderer: SkyRenderer;
  private raf = 0;
  private last = 0;
  private acc = 0;
  private visible = true;
  private disposed = false;
  private motion = matchMedia('(prefers-reduced-motion: reduce)');
  private resizeObserver = new ResizeObserver(() => this.resize());
  private visibilityObserver: IntersectionObserver;
  private themeObserver = new MutationObserver(() => {
    this.renderer.setPalette(readPalette());
    if (this.motion.matches) this.drawStill();
  });

  constructor(private canvas: HTMLCanvasElement) {
    this.renderer = new SkyRenderer(canvas);
    const family = getComputedStyle(canvas).fontFamily;
    this.renderer.setFontFamily(family);
    this.renderer.setPalette(readPalette());

    this.visibilityObserver = new IntersectionObserver(([entry]) => {
      this.visible = entry.isIntersecting;
      this.schedule();
    });
    this.resizeObserver.observe(canvas);
    this.visibilityObserver.observe(canvas);
    this.themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    this.motion.addEventListener('change', this.onMotion);
    window.addEventListener('pointermove', this.onPointerMove, { passive: true });
    window.addEventListener('pointerdown', this.onPointerDown, { passive: true });
    document.documentElement.addEventListener('pointerleave', this.onPointerLeave);
    window.addEventListener('blur', this.onPointerLeave);

    this.resize();
    // Canvas text does not trigger webfont loading; redraw once the face is in
    document.fonts?.load(`600 16px ${family}`).then(() => {
      if (!this.disposed && this.motion.matches) this.drawStill();
    });
    this.schedule();
  }

  destroy() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.resizeObserver.disconnect();
    this.visibilityObserver.disconnect();
    this.themeObserver.disconnect();
    this.motion.removeEventListener('change', this.onMotion);
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerdown', this.onPointerDown);
    document.documentElement.removeEventListener('pointerleave', this.onPointerLeave);
    window.removeEventListener('blur', this.onPointerLeave);
  }

  private resize() {
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return;
    this.renderer.resize(rect.width, rect.height, Math.min(window.devicePixelRatio || 1, 2));
    this.sky.resize(rect.width, rect.height);
    if (this.motion.matches) this.drawStill();
  }

  private schedule() {
    cancelAnimationFrame(this.raf);
    if (this.disposed || !this.visible || this.motion.matches) return;
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.frame);
  }

  private frame = (now: number) => {
    const dt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    this.acc += dt;
    let steps = 0;
    while (this.acc >= STEP && steps < MAX_STEPS) {
      this.sky.step(STEP);
      this.acc -= STEP;
      steps++;
    }
    if (steps === MAX_STEPS) this.acc = 0;
    this.renderer.render(this.sky, dt);
    this.raf = requestAnimationFrame(this.frame);
  };

  /** Reduced motion: one still frame. */
  private drawStill() {
    this.renderer.render(this.sky, STEP);
  }

  private onMotion = () => (this.motion.matches ? (cancelAnimationFrame(this.raf), this.drawStill()) : this.schedule());

  private local(event: PointerEvent) {
    const rect = this.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    return { x, y, inside: x >= 0 && y >= 0 && x <= rect.width && y <= rect.height };
  }

  private onPointerMove = (event: PointerEvent) => {
    const { x, y, inside } = this.local(event);
    const pointer = this.sky.pointer;
    if (!pointer.active) {
      pointer.px = x;
      pointer.py = y;
    }
    pointer.x = x;
    pointer.y = y;
    pointer.active = inside && event.pointerType !== 'touch';
  };

  private onPointerDown = (event: PointerEvent) => {
    const { x, y, inside } = this.local(event);
    // No gust when clicking a link or a button over the clouds
    const interactive = (event.target as Element | null)?.closest?.('a, button, input, [role="tab"]');
    if (inside && !interactive && !this.motion.matches) this.sky.gust(x, y);
  };

  private onPointerLeave = () => {
    this.sky.pointer.active = false;
  };
}
