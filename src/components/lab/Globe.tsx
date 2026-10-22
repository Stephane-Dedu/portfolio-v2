import createGlobe from 'cobe';
import { useEffect, useRef, useState } from 'react';
import type { Lang } from '../../i18n/ui';
import { prefersReducedMotion, usePalette } from '../../lib/palette';

// Example data: swap for the regions you actually deploy to
const REGIONS = [
  { code: 'eu-west-3', city: { en: 'Paris', fr: 'Paris' }, location: [48.86, 2.35] as [number, number] },
  { code: 'eu-west-1', city: { en: 'Ireland', fr: 'Irlande' }, location: [53.35, -6.26] as [number, number] },
  { code: 'us-east-1', city: { en: 'N. Virginia', fr: 'Virginie du Nord' }, location: [38.95, -77.45] as [number, number] },
];
const ARCS = [
  { from: REGIONS[0].location, to: REGIONS[2].location },
  { from: REGIONS[0].location, to: REGIONS[1].location },
];

// Rotation that puts a lat/long in front of the camera
const anglesFor = ([lat, long]: [number, number]) => ({
  phi: Math.PI - ((long * Math.PI) / 180 - Math.PI / 2),
  theta: (lat * Math.PI) / 180,
});

const TAU = Math.PI * 2;
const shortestDelta = (from: number, to: number) => ((((to - from) % TAU) + TAU * 1.5) % TAU) - Math.PI;

export default function Globe({ lang = 'en' }: { lang?: Lang }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const focusRef = useRef<{ phi: number; theta: number } | null>(null);
  const [focused, setFocused] = useState<string | null>(null);
  const palette = usePalette();

  useEffect(() => {
    const host = hostRef.current;
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    if (!host || !stage || !canvas || !palette) return;
    const reduceMotion = prefersReducedMotion();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let size = 0;
    // cobe wraps the canvas in a 100%-sized div, so the stage carries the size
    const measure = () => {
      size = Math.floor(Math.min(host.clientWidth, host.clientHeight) * 0.9);
      stage.style.width = stage.style.height = `${size}px`;
      canvas.style.width = canvas.style.height = `${size}px`;
    };
    measure();
    let phi = 0.4;
    let theta = 0.25;
    let drag: { x: number; y: number; phi: number; theta: number } | null = null;
    let raf = 0;

    const globe = createGlobe(canvas, {
      devicePixelRatio: dpr,
      // cobe multiplies width/height by devicePixelRatio itself
      width: size,
      height: size,
      phi,
      theta,
      dark: palette.dark ? 1 : 0,
      diffuse: 1.2,
      mapSamples: 16000,
      mapBrightness: palette.dark ? 4 : 8,
      baseColor: palette.dark ? [0.22, 0.22, 0.24] : [1, 1, 1],
      markerColor: palette.accent,
      glowColor: palette.dark ? [0.1, 0.1, 0.11] : [0.92, 0.92, 0.9],
      markers: REGIONS.map((r) => ({ location: r.location, size: 0.055 })),
      arcs: ARCS,
      arcColor: palette.accent,
    });

    const loop = () => {
      const focus = focusRef.current;
      if (drag) {
        // user is in control
      } else if (focus) {
        phi += shortestDelta(phi, focus.phi) * 0.08;
        theta += (focus.theta - theta) * 0.08;
      } else if (!reduceMotion) {
        phi += 0.0025;
        theta += (0.25 - theta) * 0.02;
      }
      globe.update({ phi, theta, width: size, height: size });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    requestAnimationFrame(() => (canvas.style.opacity = '1'));

    const onDown = (event: PointerEvent) => {
      drag = { x: event.clientX, y: event.clientY, phi, theta };
      focusRef.current = null;
      setFocused(null);
      canvas.setPointerCapture(event.pointerId);
      canvas.style.cursor = 'grabbing';
    };
    const onMove = (event: PointerEvent) => {
      if (!drag) return;
      phi = drag.phi + (event.clientX - drag.x) / 160;
      theta = Math.max(-0.7, Math.min(0.9, drag.theta + (event.clientY - drag.y) / 320));
    };
    const onUp = () => {
      drag = null;
      canvas.style.cursor = 'grab';
    };
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onUp);

    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(host);

    return () => {
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      globe.destroy();
      // Undo cobe's wrapper so a theme change doesn't nest a new one
      const wrapper = canvas.parentElement;
      if (wrapper && wrapper !== stage) {
        stage.append(canvas);
        wrapper.remove();
      }
    };
  }, [palette]);

  const focus = (region: (typeof REGIONS)[number] | null) => {
    focusRef.current = region ? anglesFor(region.location) : null;
    setFocused(region?.code ?? null);
  };

  return (
    <div ref={hostRef} className="absolute inset-0 flex items-center justify-center sm:justify-end sm:pr-10">
      <div className="absolute bottom-4 left-4 z-10 sm:bottom-auto sm:left-6 sm:top-1/2 sm:-translate-y-1/2">
        <p className="label mb-3 hidden sm:block">{lang === 'fr' ? 'régions (exemple)' : 'regions (example)'}</p>
        <ul className="flex flex-col gap-1" onMouseLeave={() => focus(null)}>
          {REGIONS.map((region) => (
            <li key={region.code}>
              <button
                type="button"
                onMouseEnter={() => focus(region)}
                onFocus={() => focus(region)}
                onClick={() => focus(region)}
                className={`flex items-baseline gap-3 font-mono text-xs transition-colors ${
                  focused === region.code ? 'text-fg' : 'text-muted hover:text-fg'
                }`}
              >
                <span className={`size-1.5 rounded-full ${focused === region.code ? 'bg-accent' : 'bg-faint'}`} />
                <span className="w-20 text-left">{region.code}</span>
                <span className="hidden text-faint sm:inline">{region.city[lang]}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div ref={stageRef} className="shrink-0">
        <canvas
          ref={canvasRef}
          aria-label={lang === 'fr' ? 'Globe interactif des régions AWS' : 'Interactive globe of AWS regions'}
          className="cursor-grab touch-none opacity-0 transition-opacity duration-700"
        />
      </div>
    </div>
  );
}
