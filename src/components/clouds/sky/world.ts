/**
 * A small sky: cumulus clouds drifting on a steady wind, pushed around by the pointer.
 *
 * Approach inspired by stackedlol/ascii-sharks (distinct bodies on a character grid,
 * a fixed-timestep world kept apart from the renderer). The code here is our own.
 */

export interface Puff {
  /** Offset from the cloud's base point, in px. */
  dx: number;
  dy: number;
  r: number;
  phase: number;
}

export interface Cloud {
  id: number;
  /** Centre of the flat base, in px. */
  x: number;
  y: number;
  homeY: number;
  vx: number;
  vy: number;
  /** Cruising speed on the wind, px/s. */
  drift: number;
  /** 0 far, small and faint → 1 near, big and bright. */
  depth: number;
  width: number;
  height: number;
  puffs: Puff[];
}

export interface Gust {
  x: number;
  y: number;
}

const rand = (lo: number, hi: number) => lo + Math.random() * (hi - lo);
const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);

const PUSH_RADIUS = 230;
const GUST_RADIUS = 380;

export class Sky {
  width = 0;
  height = 0;
  time = 0;
  clouds: Cloud[] = [];
  /** Pointer in canvas px; `px/py` hold the previous position to read its speed. */
  pointer = { x: 0, y: 0, px: 0, py: 0, active: false, moved: 0 };
  gusts: Gust[] = [];
  private nextId = 1;

  resize(width: number, height: number) {
    const first = this.width === 0;
    this.width = width;
    this.height = height;
    if (first) {
      this.seed();
      return;
    }
    for (const cloud of this.clouds) cloud.homeY = clamp(cloud.homeY, height * 0.1, height * 0.8);
  }

  private seed() {
    const count = clamp(Math.round(this.width / 230), 3, 9);
    this.clouds = [];
    for (let i = 0; i < count; i++) {
      // Spread them across the width, with some jitter, and sort far to near for drawing
      const x = ((i + rand(0.15, 0.85)) / count) * (this.width + 200) - 100;
      this.clouds.push(this.makeCloud(x, rand(0.15, 1)));
    }
    this.clouds.sort((a, b) => a.depth - b.depth);
  }

  private makeCloud(x: number, depth: number): Cloud {
    const scale = (0.5 + 0.5 * depth) * clamp(this.width / 1300, 0.55, 1.15);
    const width = rand(220, 420) * scale;
    const height = width * rand(0.32, 0.42);
    const puffs: Puff[] = [];
    const add = (dx: number, dy: number, r: number) => puffs.push({ dx, dy, r, phase: rand(0, Math.PI * 2) });
    // Cauliflower cumulus: a wide flat base, a fuller middle, a few towers on top
    const base = Math.round(rand(5, 8));
    for (let k = 0; k < base; k++) {
      const t = (k + 0.5) / base;
      const r = height * rand(0.24, 0.34) * (0.75 + 0.25 * Math.sin(Math.PI * t));
      add((t - 0.5) * width * 0.9, -r * 0.7, r);
    }
    const middle = Math.round(rand(3, 5));
    for (let k = 0; k < middle; k++) {
      const t = (k + rand(0.25, 0.75)) / middle;
      add((t - 0.5) * width * 0.62, -height * rand(0.38, 0.52), height * rand(0.26, 0.36));
    }
    const towers = Math.round(rand(1, 3));
    for (let k = 0; k < towers; k++) {
      const t = (k + rand(0.3, 0.7)) / towers;
      add((t - 0.5) * width * 0.36, -height * rand(0.66, 0.8), height * rand(0.2, 0.3));
    }
    const y = rand(this.height * 0.18, this.height * 0.78);
    const drift = 6 + 16 * depth;
    return { id: this.nextId++, x, y, homeY: y, vx: drift, vy: 0, drift, depth, width, height, puffs };
  }

  gust(x: number, y: number) {
    this.gusts.push({ x, y });
    for (const cloud of this.clouds) {
      const cx = cloud.x;
      const cy = cloud.y - cloud.height * 0.5;
      const dx = cx - x;
      const dy = cy - y;
      const dist = Math.hypot(dx, dy) || 1;
      if (dist > GUST_RADIUS) continue;
      const k = 260 * (1 - dist / GUST_RADIUS) * (0.6 + 0.4 * cloud.depth);
      cloud.vx += (dx / dist) * k;
      cloud.vy += (dy / dist) * k * 0.5;
    }
  }

  step(dt: number) {
    this.time += dt;
    const { pointer } = this;
    // Pointer speed, so a swipe drags clouds along with it
    const pvx = (pointer.x - pointer.px) / dt;
    const pvy = (pointer.y - pointer.py) / dt;
    pointer.moved = pointer.active ? Math.min(1, Math.hypot(pvx, pvy) / 900) : 0;

    for (const cloud of this.clouds) {
      if (pointer.active) {
        const dx = cloud.x - pointer.x;
        const dy = cloud.y - cloud.height * 0.5 - pointer.y;
        const dist = Math.hypot(dx, dy) || 1;
        const reach = PUSH_RADIUS + cloud.width * 0.3;
        if (dist < reach) {
          const falloff = (1 - dist / reach) ** 2;
          // Gentle push away, plus a share of the pointer's own motion
          cloud.vx += ((dx / dist) * 520 * falloff + pvx * 0.9 * falloff) * dt * (0.5 + 0.5 * cloud.depth);
          cloud.vy += ((dy / dist) * 300 * falloff + pvy * 0.5 * falloff) * dt * (0.5 + 0.5 * cloud.depth);
        }
      }
      // Ease back to the wind and to the cloud's own altitude
      cloud.vx += (cloud.drift - cloud.vx) * dt * 0.7;
      cloud.vy += (cloud.homeY - cloud.y) * dt * 0.6 - cloud.vy * dt * 1.4;
      cloud.x += cloud.vx * dt;
      cloud.y += cloud.vy * dt;

      // Off one side: a new cloud comes in from the other
      const margin = cloud.width / 2 + 60;
      if (cloud.x - margin > this.width) {
        Object.assign(cloud, this.makeCloud(-margin, cloud.depth));
      } else if (cloud.x + margin < -cloud.width) {
        Object.assign(cloud, this.makeCloud(this.width + margin, cloud.depth));
      }
    }
    pointer.px = pointer.x;
    pointer.py = pointer.y;
  }
}
