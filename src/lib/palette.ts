import { useEffect, useState } from 'react';

export type RGB = [number, number, number];
export type Palette = { ink: RGB; paper: RGB; bg: RGB; accent: RGB; dark: boolean };

const hexToRgb = (value: string): RGB => {
  const hex = value.trim().replace('#', '');
  const full = hex.length === 3 ? [...hex].map((c) => c + c).join('') : hex;
  const n = Number.parseInt(full, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

export const readPalette = (): Palette => {
  const css = getComputedStyle(document.documentElement);
  return {
    ink: hexToRgb(css.getPropertyValue('--fg')),
    paper: hexToRgb(css.getPropertyValue('--surface')),
    bg: hexToRgb(css.getPropertyValue('--bg')),
    accent: hexToRgb(css.getPropertyValue('--accent')),
    dark: document.documentElement.dataset.theme === 'dark',
  };
};

/** Theme colors from the CSS tokens, re-read whenever data-theme changes. */
export function usePalette() {
  const [palette, setPalette] = useState<Palette | null>(null);
  useEffect(() => {
    const update = () => setPalette(readPalette());
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);
  return palette;
}

export const prefersReducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
