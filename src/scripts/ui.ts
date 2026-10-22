import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

// Smooth scroll, driven by GSAP's ticker so ScrollTrigger stays in sync
if (!reduceMotion) {
  const lenis = new Lenis({ lerp: 0.12, anchors: { offset: -80 } });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
}

// Header gets a border once the page is scrolled
const header = document.querySelector<HTMLElement>('[data-header]');
const syncHeader = () => header?.toggleAttribute('data-scrolled', window.scrollY > 8);
window.addEventListener('scroll', syncHeader, { passive: true });
syncHeader();

document.querySelectorAll('[data-open-palette]').forEach((button) =>
  button.addEventListener('click', () => window.dispatchEvent(new Event('palette:open'))),
);

document.querySelectorAll('[data-theme-toggle]').forEach((button) =>
  button.addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    window.__setTheme?.(next);
  }),
);

// Fade sections in as they scroll into view
if (!reduceMotion) {
  gsap.utils.toArray<HTMLElement>('[data-reveal]').forEach((el) => {
    gsap.from(el, {
      opacity: 0,
      y: 18,
      duration: 0.8,
      ease: 'power2.out',
      scrollTrigger: { trigger: el, start: 'top 90%', once: true },
    });
  });
}

// Spotlight halo position
document.querySelectorAll<HTMLElement>('.spotlight').forEach((el) =>
  el.addEventListener('pointermove', (event) => {
    const rect = el.getBoundingClientRect();
    el.style.setProperty('--mx', `${event.clientX - rect.left}px`);
    el.style.setProperty('--my', `${event.clientY - rect.top}px`);
  }),
);
