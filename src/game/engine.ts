// Canvas game engine: loop, input, physics, spawning, absorption, rendering.
import { DEMO_LEVEL, LEVELS, OBJECTS, PLAYER, RARE_NAMES, SKINS, type LevelDef, type ObjType, type Skin } from "./data";
import { canAbsorb, radiusForMass, type RunStats, type Settings } from "./logic";
import { getSprite, rng, VARIANTS, type Sprite } from "./sprites";
import { drawBlackHole } from "./blackhole";
import { sfx } from "./audio";

interface Body {
  type: ObjType; x: number; y: number; vx: number; vy: number; r: number; mass: number;
  rot: number; spin: number; variant: number; sprite: Sprite | null; seed: number;
  absorbing: boolean; t: number; dur: number; a0: number; d0: number; dir: number;
  eligible: boolean; inField: boolean; dead: boolean; name: string; trailT: number;
}
interface Particle { x: number; y: number; vx: number; vy: number; life: number; max: number; size: number; color: string; }
interface Ring { x: number; y: number; r: number; max: number; life: number; dur: number; color: string; width: number; }
interface FloatText { x: number; y: number; text: string; life: number; color: string; big: boolean; }

export interface HudState { mass: number; target: number; time: number; levelIndex: number; }
export interface EngineCallbacks {
  onHud?: (h: HudState) => void;
  onComplete?: (stats: RunStats) => void;
  onPauseRequest?: () => void;
  onBlur?: () => void;
  onToast?: (msg: string) => void;
  onTutorial?: (ev: "moved" | "pulled" | "absorbed") => void;
  onMass?: (mass: number) => void;
}
export interface EngineConfig { upgrades: Record<string, number>; skin: string; settings: Settings; }

const MAX_PARTICLES = 420;
const TAU = Math.PI * 2;

export class Engine {
  canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D; cb: EngineCallbacks;
  w = 0; h = 0; dpr = 1; raf = 0; last = 0; destroyed = false;
  mode: "demo" | "play" = "demo"; paused = false; completing = 0;
  level: LevelDef = DEMO_LEVEL; levelIndex = -1;
  bodies: Body[] = []; particles: Particle[] = []; pool: Particle[] = []; rings: Ring[] = []; texts: FloatText[] = [];
  player = { x: 0, y: 0, vx: 0, vy: 0, mass: 10, disp: 10 };
  cam = { x: 0, y: 0, zoom: 1 }; bgOff = { x: 0, y: 0 };
  time = 0; runTime = 0; shake = 0; flash = 0; flashColor = "#fff"; pulse = 0;
  keys = new Set<string>(); joy = { x: 0, y: 0 };
  cfg: EngineConfig = { upgrades: {}, skin: "horizon", settings: { audio: true, sfx: 0.7, music: 0.4, shake: true, reduced: false } };
  skin: Skin = SKINS[0];
  stats: RunStats = { mass: 0, time: 0, counts: {} };
  notified = new Set<ObjType>(); nearToast = false; hudT = 0; movedDist = 0; movedSent = false; pulledSent = false;
  highlight = false; demoDir = 0; seedN = 1;
  starTiles: HTMLCanvasElement[] = []; nebula: HTMLCanvasElement | null = null; nebulaHues = "";
  shooting: { x: number; y: number; vx: number; vy: number; life: number } | null = null;

  constructor(canvas: HTMLCanvasElement, cb: EngineCallbacks) {
    this.canvas = canvas; this.cb = cb;
    this.ctx = canvas.getContext("2d")!;
    this.resize();
    window.addEventListener("resize", this.resize);
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("blur", this.onBlurEv);
    document.addEventListener("visibilitychange", this.onVis);
    this.buildStars();
    this.startDemo();
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.loop);
  }

  destroy() {
    this.destroyed = true; cancelAnimationFrame(this.raf);
    window.removeEventListener("resize", this.resize);
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("blur", this.onBlurEv);
    document.removeEventListener("visibilitychange", this.onVis);
  }

  setConfig(c: EngineConfig) { this.cfg = c; this.skin = SKINS.find((s) => s.id === c.skin) ?? SKINS[0]; }
  up(id: string) { const per = { gravity: 0.12, growth: 0.07, speed: 0.07, efficiency: 0.15 }[id] ?? 0; return 1 + per * (this.cfg.upgrades[id] ?? 0); }

  // ---------- input ----------
  onKeyDown = (e: KeyboardEvent) => {
    const k = e.key.toLowerCase();
    if (k === "escape") { if (this.mode === "play" && !this.completing) this.cb.onPauseRequest?.(); return; }
    if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(k)) {
      const tgt = e.target as HTMLElement | null;
      if (tgt && (tgt.tagName === "INPUT" || tgt.tagName === "SELECT")) return;
      if (this.mode === "play" && !this.paused && k.startsWith("arrow")) e.preventDefault();
      this.keys.add(k);
    }
  };
  onKeyUp = (e: KeyboardEvent) => { this.keys.delete(e.key.toLowerCase()); };
  onBlurEv = () => { this.resetInput(); if (this.mode === "play" && !this.paused && !this.completing) this.cb.onBlur?.(); };
  onVis = () => { if (document.hidden) this.onBlurEv(); };
  resetInput() { this.keys.clear(); this.joy.x = 0; this.joy.y = 0; }
  setJoystick(x: number, y: number) { this.joy.x = x; this.joy.y = y; }

  resize = () => {
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.w = window.innerWidth; this.h = window.innerHeight;
    this.canvas.width = Math.floor(this.w * this.dpr); this.canvas.height = Math.floor(this.h * this.dpr);
    this.canvas.style.width = this.w + "px"; this.canvas.style.height = this.h + "px";
  };

  // ---------- state ----------
  private reset(level: LevelDef) {
    this.level = level;
    this.bodies = []; this.rings = []; this.texts = [];
    for (const p of this.particles) this.pool.push(p);
    this.particles = [];
    this.player = { x: 0, y: 0, vx: 0, vy: 0, mass: level.startMass, disp: level.startMass };
    this.cam = { x: 0, y: 0, zoom: this.zoomFor(radiusForMass(level.startMass)) };
    this.time = 0; this.runTime = 0; this.shake = 0; this.flash = 0; this.completing = 0;
    this.stats = { mass: level.startMass, time: 0, counts: {} };
    this.notified = new Set(Object.keys(level.weights).filter((t) => canAbsorb(level.startMass, t as ObjType)) as ObjType[]);
    this.nearToast = false; this.movedDist = 0; this.movedSent = false; this.pulledSent = false;
    this.resetInput();
    this.buildNebula(level.hues);
    for (let i = 0; i < level.density; i++) this.spawn(true);
  }
  startDemo() { this.mode = "demo"; this.paused = false; this.levelIndex = -1; this.reset(DEMO_LEVEL); }
  startLevel(i: number) { this.mode = "play"; this.paused = false; this.levelIndex = i; this.reset(LEVELS[i]); this.emitHud(); }
  pause() { this.paused = true; this.resetInput(); }
  resume() { this.paused = false; this.resetInput(); this.last = performance.now(); }

  zoomFor(r: number) { const base = Math.min(1, Math.max(0.6, Math.min(this.w, this.h) / 800)); return base * Math.pow(12 / r, 0.7); }
  viewRadius() { return Math.hypot(this.w, this.h) / 2 / this.cam.zoom; }

  // ---------- spawning ----------
  private pickType(forceEligible: boolean): ObjType {
    let entries = Object.entries(this.level.weights) as [ObjType, number][];
    if (forceEligible) {
      const el = entries.filter(([t]) => canAbsorb(this.player.mass, t));
      entries = el.length ? el : [entries.reduce((a, b) => (OBJECTS[a[0]].minMass < OBJECTS[b[0]].minMass ? a : b))];
    }
    const total = entries.reduce((a, [, w]) => a + w, 0);
    let r = Math.random() * total;
    for (const [t, w] of entries) { r -= w; if (r <= 0) return t; }
    return entries[0][0];
  }

  private spawn(initial: boolean, forceEligible = false) {
    const type = this.pickType(forceEligible);
    const def = OBJECTS[type];
    const vr = this.viewRadius();
    const pr = radiusForMass(this.player.mass);
    let x = 0, y = 0;
    for (let tries = 0; tries < 6; tries++) {
      const a = Math.random() * TAU;
      const d = initial ? pr * 4 + Math.random() * vr * 1.7 : vr * (1.1 + Math.random() * 0.7);
      x = this.player.x + Math.cos(a) * d; y = this.player.y + Math.sin(a) * d;
      if (def.tier === 0) break;
      const r = def.radius[1] * 2.5;
      if (!this.bodies.some((b) => b.r > 12 && Math.abs(b.x - x) < r + b.r && Math.abs(b.y - y) < r + b.r)) break;
    }
    const k = Math.random();
    const seed = this.seedN++;
    const variant = Math.floor(Math.random() * VARIANTS);
    this.bodies.push({
      type, x, y,
      vx: (Math.random() - 0.5) * 14, vy: (Math.random() - 0.5) * 14,
      r: def.radius[0] + (def.radius[1] - def.radius[0]) * k,
      mass: Math.round(def.mass[0] + (def.mass[1] - def.mass[0]) * k),
      rot: Math.random() * TAU, spin: (Math.random() - 0.5) * (def.tier === 0 ? 1.6 : 0.3),
      variant, sprite: type === "dust" ? null : getSprite(type, variant), seed,
      absorbing: false, t: 0, dur: def.absorbTime, a0: 0, d0: 0, dir: 1,
      eligible: false, inField: false, dead: false, trailT: 0,
      name: type === "rare" ? RARE_NAMES[variant % RARE_NAMES.length] : def.name,
    });
  }

  // ---------- loop ----------
  loop = (now: number) => {
    if (this.destroyed) return;
    const dt = Math.min(1 / 30, Math.max(0, (now - this.last) / 1000));
    this.last = now;
    if (!this.paused) this.update(dt);
    this.render();
    this.raf = requestAnimationFrame(this.loop);
  };

  private update(dt: number) {
    this.time += dt;
    const P = this.player;
    const playing = this.mode === "play";
    const frozen = this.completing > 0;

    if (frozen) {
      this.completing += dt;
      P.vx *= 0.9; P.vy *= 0.9;
      if (this.completing > 1.6 && this.completing - dt <= 1.6) {
        this.stats.time = this.runTime; this.stats.mass = Math.floor(P.mass);
        this.cb.onComplete?.({ ...this.stats, counts: { ...this.stats.counts } });
      }
    } else if (playing) this.runTime += dt;

    // input
    let ix = 0, iy = 0;
    if (!frozen) {
      if (playing) {
        if (this.keys.has("a") || this.keys.has("arrowleft")) ix -= 1;
        if (this.keys.has("d") || this.keys.has("arrowright")) ix += 1;
        if (this.keys.has("w") || this.keys.has("arrowup")) iy -= 1;
        if (this.keys.has("s") || this.keys.has("arrowdown")) iy += 1;
        ix += this.joy.x; iy += this.joy.y;
      } else {
        this.demoDir += (Math.sin(this.time * 0.37) * 0.6 + Math.sin(this.time * 0.13)) * dt;
        ix = Math.cos(this.demoDir) * 0.55; iy = Math.sin(this.demoDir) * 0.55;
      }
    }
    const il = Math.hypot(ix, iy); if (il > 1) { ix /= il; iy /= il; }
    P.disp += (P.mass - P.disp) * (1 - Math.exp(-dt * 5));
    const pr = radiusForMass(P.disp);
    const maxSpeed = PLAYER.baseSpeed * Math.pow(pr / 12, 0.72) * this.up("speed");
    const rate = il > 0.05 ? PLAYER.accel : PLAYER.decel;
    const f = 1 - Math.exp(-dt * rate);
    P.vx += (ix * maxSpeed - P.vx) * f; P.vy += (iy * maxSpeed - P.vy) * f;
    P.x += P.vx * dt; P.y += P.vy * dt;
    if (playing && !this.movedSent) {
      this.movedDist += Math.hypot(P.vx, P.vy) * dt * this.cam.zoom;
      if (this.movedDist > 260) { this.movedSent = true; this.cb.onTutorial?.("moved"); }
    }

    // camera
    const prevX = this.cam.x, prevY = this.cam.y;
    const cf = 1 - Math.exp(-dt * 6);
    this.cam.x += (P.x - this.cam.x) * cf; this.cam.y += (P.y - this.cam.y) * cf;
    this.cam.zoom += (this.zoomFor(pr) - this.cam.zoom) * (1 - Math.exp(-dt * 2));
    this.bgOff.x += (this.cam.x - prevX) * this.cam.zoom; this.bgOff.y += (this.cam.y - prevY) * this.cam.zoom;

    // bodies
    const gravR = pr * PLAYER.gravityMult * this.up("gravity");
    const eff = this.up("efficiency");
    const vr = this.viewRadius();
    let eligibleCount = 0;
    for (const b of this.bodies) {
      b.rot += b.spin * dt;
      if (b.absorbing) {
        b.t += dt;
        const p = Math.min(1, b.t / b.dur);
        const e = p * p * (1.6 - 0.6 * p);
        const ang = b.a0 + b.dir * e * Math.PI * 1.6;
        const d = b.d0 * (1 - e);
        b.x = P.x + Math.cos(ang) * d; b.y = P.y + Math.sin(ang) * d;
        b.rot += b.dir * dt * 6 * e;
        b.trailT -= dt;
        if (OBJECTS[b.type].tier >= 1 && b.trailT <= 0) { b.trailT = 0.03; this.emit(b.x, b.y, 1, b.sprite?.tint ?? "#fff", b.r * 0.25, 20); }
        if (p >= 1 && !b.dead) this.consume(b);
        continue;
      }
      const dx = P.x - b.x, dy = P.y - b.y;
      const d = Math.hypot(dx, dy) || 0.001;
      b.eligible = canAbsorb(P.mass, b.type);
      if (b.eligible) eligibleCount++;
      b.inField = d < gravR + b.r;
      if (b.inField && b.eligible && !frozen) {
        if (playing && !this.pulledSent) { this.pulledSent = true; this.cb.onTutorial?.("pulled"); }
        const closeness = 1 - Math.min(1, d / (gravR + b.r));
        const a = 520 * Math.pow(pr / 12, 0.8) * OBJECTS[b.type].pull * eff * (0.4 + 2.6 * closeness * closeness);
        const nx = dx / d, ny = dy / d;
        b.vx += (nx * a - ny * a * 0.35) * dt; b.vy += (ny * a + nx * a * 0.35) * dt;
        b.vx *= 1 - Math.min(1, dt * 1.5); b.vy *= 1 - Math.min(1, dt * 1.5);
        if (d < pr * 0.95 + b.r * 0.35) {
          b.absorbing = true; b.t = 0; b.a0 = Math.atan2(-dy, -dx); b.d0 = d;
          b.dir = (nx * b.vy - ny * b.vx) >= 0 ? -1 : 1;
          b.dur = OBJECTS[b.type].absorbTime / eff;
        }
      } else {
        b.vx *= 1 - Math.min(1, dt * 0.2); b.vy *= 1 - Math.min(1, dt * 0.2);
      }
      b.x += b.vx * dt; b.y += b.vy * dt;
      if (d > vr * 2.4) b.dead = true;
    }
    if (this.bodies.some((b) => b.dead)) this.bodies = this.bodies.filter((b) => !b.dead);
    if (!frozen) {
      let n = 0;
      while (this.bodies.length < this.level.density && n++ < 4) this.spawn(false, eligibleCount < this.level.density * 0.4);
    }

    // effects
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]; p.life -= dt;
      if (p.life <= 0) { this.pool.push(p); this.particles[i] = this.particles[this.particles.length - 1]; this.particles.pop(); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.96; p.vy *= 0.96;
    }
    this.rings = this.rings.filter((r) => (r.life += dt) < r.dur);
    this.texts = this.texts.filter((t) => (t.life += dt) < 1.3);
    this.shake *= Math.exp(-dt * 8); this.flash = Math.max(0, this.flash - dt * 2.5); this.pulse *= Math.exp(-dt * 4);
    if (!this.shooting && Math.random() < dt * 0.15) {
      const a = 0.4 + Math.random() * 0.5;
      this.shooting = { x: Math.random() * this.w, y: -20, vx: -Math.cos(a) * 700, vy: Math.sin(a) * 700, life: 1 };
    }
    if (this.shooting) { const s = this.shooting; s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt; if (s.life <= 0) this.shooting = null; }

    if (playing) {
      this.hudT -= dt;
      if (this.hudT <= 0) { this.hudT = 0.08; this.emitHud(); }
    } else if (P.mass > 2200) { P.mass = 300; }
  }

  emitHud() { this.cb.onHud?.({ mass: Math.floor(this.player.mass), target: this.level.target, time: this.runTime, levelIndex: this.levelIndex }); }

  private consume(b: Body) {
    b.dead = true;
    const P = this.player;
    const def = OBJECTS[b.type];
    const gain = Math.max(1, Math.round(b.mass * this.up("growth")));
    const before = P.mass;
    P.mass += gain;
    const tint = b.sprite?.tint ?? "#bfefff";
    const playing = this.mode === "play";
    const red = this.cfg.settings.reduced;
    if (def.tier === 0) {
      this.emit(P.x, P.y, red ? 2 : 5, tint, 2, 80);
      if (playing) sfx.absorbSmall();
    } else {
      this.emit(P.x, P.y, red ? 10 : def.tier >= 2 ? 60 : 28, tint, 3, def.tier >= 2 ? 420 : 240);
      this.rings.push({ x: P.x, y: P.y, r: radiusForMass(P.mass), max: radiusForMass(P.mass) * (def.tier >= 2 ? 6 : 3.5), life: 0, dur: def.tier >= 2 ? 0.9 : 0.6, color: tint, width: def.tier >= 2 ? 6 : 3 });
      if (playing) { if (def.tier >= 2) sfx.absorbStar(); else sfx.absorbPlanet(); }
      if (this.cfg.settings.shake) this.shake = Math.min(14, this.shake + (def.tier >= 2 ? 10 : 4));
      if (def.tier >= 2) { this.flash = red ? 0.12 : 0.3; this.flashColor = tint; }
      this.pulse = def.tier >= 2 ? 1 : 0.5;
    }
    if (playing) {
      this.texts.push({ x: P.x, y: P.y, text: `+${gain}`, life: 0, color: tint, big: def.tier >= 1 });
      if (def.tier >= 1) this.texts.push({ x: P.x, y: P.y, text: b.name, life: -0.05, color: "#ffffff", big: false });
      this.stats.counts[b.type] = (this.stats.counts[b.type] ?? 0) + 1;
      this.cb.onTutorial?.("absorbed");
      this.cb.onMass?.(P.mass);
      for (const t of Object.keys(this.level.weights) as ObjType[]) {
        if (!this.notified.has(t) && canAbsorb(P.mass, t)) {
          this.notified.add(t); this.cb.onToast?.(`${OBJECTS[t].plural} can now be absorbed`);
          this.rings.push({ x: P.x, y: P.y, r: radiusForMass(P.mass), max: radiusForMass(P.mass) * 5, life: 0, dur: 0.8, color: this.skin.mid, width: 4 });
        }
      }
      const tgt = this.level.target;
      if (!this.nearToast && P.mass >= tgt * 0.85 && P.mass < tgt) { this.nearToast = true; this.cb.onToast?.("Almost there — the sector is nearly consumed"); }
      if (before < tgt && P.mass >= tgt && !this.completing) {
        this.completing = 0.0001; this.emitHud();
        this.rings.push({ x: P.x, y: P.y, r: radiusForMass(P.mass), max: radiusForMass(P.mass) * 10, life: 0, dur: 1.4, color: this.skin.hot, width: 8 });
        this.emit(P.x, P.y, red ? 20 : 90, this.skin.mid, 3, 500);
        this.flash = 0.35; this.flashColor = this.skin.glow; this.pulse = 1.5;
        sfx.complete();
      }
    }
  }

  private emit(x: number, y: number, n: number, color: string, size: number, speed: number) {
    const limit = this.cfg.settings.reduced ? 140 : MAX_PARTICLES;
    for (let i = 0; i < n && this.particles.length < limit; i++) {
      const p = this.pool.pop() ?? ({} as Particle);
      const a = Math.random() * TAU, s = speed * (0.3 + Math.random() * 0.7) / Math.max(0.3, this.cam.zoom);
      p.x = x; p.y = y; p.vx = Math.cos(a) * s; p.vy = Math.sin(a) * s;
      p.max = p.life = 0.4 + Math.random() * 0.6; p.size = size * (0.5 + Math.random()); p.color = color;
      this.particles.push(p);
    }
  }

  // ---------- background ----------
  private buildStars() {
    const layers = [{ n: 260, s: 0.8, a: 0.5 }, { n: 120, s: 1.3, a: 0.75 }, { n: 45, s: 2, a: 1 }];
    this.starTiles = layers.map((L, li) => {
      const c = document.createElement("canvas"); c.width = c.height = 1024;
      const x = c.getContext("2d")!; const r = rng(li * 77 + 3);
      if (li === 0) { // distant galaxies
        for (let g = 0; g < 3; g++) {
          const gx = r() * 1024, gy = r() * 1024, gr = 20 + r() * 30;
          x.save(); x.translate(gx, gy); x.rotate(r() * 3); x.scale(1, 0.35);
          const grd = x.createRadialGradient(0, 0, 0, 0, 0, gr); grd.addColorStop(0, "rgba(220,200,255,0.35)"); grd.addColorStop(1, "rgba(120,100,255,0)");
          x.fillStyle = grd; x.beginPath(); x.arc(0, 0, gr, 0, TAU); x.fill(); x.restore();
        }
      }
      for (let i = 0; i < L.n; i++) {
        const hue = r() < 0.2 ? "200,220,255" : r() < 0.1 ? "255,220,200" : "255,255,255";
        x.fillStyle = `rgba(${hue},${L.a * (0.3 + r() * 0.7)})`;
        const sz = L.s * (0.4 + r() * 0.8);
        x.beginPath(); x.arc(r() * 1024, r() * 1024, sz, 0, TAU); x.fill();
        if (li === 2 && r() < 0.3) { x.fillStyle = `rgba(${hue},0.12)`; x.beginPath(); x.arc(r() * 1024, r() * 1024, sz * 4, 0, TAU); x.fill(); }
      }
      return c;
    });
  }
  private buildNebula(hues: [number, number]) {
    const key = hues.join(","); if (key === this.nebulaHues && this.nebula) return;
    this.nebulaHues = key;
    const c = this.nebula ?? document.createElement("canvas"); c.width = c.height = 1024;
    const x = c.getContext("2d")!; x.clearRect(0, 0, 1024, 1024);
    const r = rng(hues[0] * 13 + hues[1]);
    for (let i = 0; i < 14; i++) {
      const h = i % 2 ? hues[0] : hues[1];
      const cx = r() * 1024, cy = r() * 1024, rad = 150 + r() * 300;
      for (const [ox, oy] of [[0, 0], [1024, 0], [-1024, 0], [0, 1024], [0, -1024]]) {
        const g = x.createRadialGradient(cx + ox, cy + oy, 0, cx + ox, cy + oy, rad);
        g.addColorStop(0, `hsla(${h},80%,55%,${0.08 + r() * 0.06})`); g.addColorStop(1, `hsla(${h},80%,40%,0)`);
        x.fillStyle = g; x.fillRect(0, 0, 1024, 1024);
      }
    }
    this.nebula = c;
  }
  private tile(img: HTMLCanvasElement, factor: number, alpha: number) {
    const ctx = this.ctx; const S = 1024;
    const ox = ((-this.bgOff.x * factor) % S + S) % S, oy = ((-this.bgOff.y * factor) % S + S) % S;
    ctx.globalAlpha = alpha;
    for (let x = ox - S; x < this.w; x += S) for (let y = oy - S; y < this.h; y += S) ctx.drawImage(img, x, y);
    ctx.globalAlpha = 1;
  }

  // ---------- render ----------
  render() {
    const ctx = this.ctx; const { w, h } = this;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    const bg = ctx.createLinearGradient(0, 0, w * 0.4, h);
    bg.addColorStop(0, "#05041a"); bg.addColorStop(0.6, "#0a0828"); bg.addColorStop(1, "#02020c");
    ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
    if (this.nebula) this.tile(this.nebula, 0.05, 1);
    this.tile(this.starTiles[0], 0.08, 1);
    this.tile(this.starTiles[1], 0.2, 1);
    if (this.shooting) {
      const s = this.shooting; const g = ctx.createLinearGradient(s.x, s.y, s.x - s.vx * 0.12, s.y - s.vy * 0.12);
      g.addColorStop(0, `rgba(255,255,255,${s.life})`); g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.strokeStyle = g; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x - s.vx * 0.12, s.y - s.vy * 0.12); ctx.stroke();
    }
    this.tile(this.starTiles[2], 0.45, 1);

    const z = this.cam.zoom;
    const sx = this.shake > 0.2 ? (Math.random() - 0.5) * this.shake : 0;
    const sy = this.shake > 0.2 ? (Math.random() - 0.5) * this.shake : 0;
    const cx = w / 2 - this.cam.x * z + sx, cy = h / 2 - this.cam.y * z + sy;
    const P = this.player; const pr = radiusForMass(P.disp);
    const px = cx + P.x * z, py = cy + P.y * z;
    const gravR = pr * PLAYER.gravityMult * this.up("gravity");
    const red = this.cfg.settings.reduced;
    const t = this.time;

    // gravity field
    ctx.strokeStyle = this.skin.mid; ctx.globalAlpha = 0.12; ctx.lineWidth = 1;
    ctx.setLineDash([4, 10]); ctx.lineDashOffset = -t * 20;
    ctx.beginPath(); ctx.arc(px, py, gravR * z, 0, TAU); ctx.stroke();
    ctx.setLineDash([]); ctx.globalAlpha = 1;

    // bodies
    for (const b of this.bodies) {
      let bx = cx + b.x * z, by = cy + b.y * z;
      const pad = b.sprite ? b.sprite.pad : 3;
      const br = b.r * z;
      if (bx < -br * pad || bx > w + br * pad || by < -br * pad || by > h + br * pad) continue;
      const def = OBJECTS[b.type];
      let scale = 1, stretch = 0;
      const dpx = px - bx, dpy = py - by; const dd = Math.hypot(dpx, dpy) || 1;
      if (b.absorbing) { const p = Math.min(1, b.t / b.dur); scale = 1 - 0.92 * p * p; stretch = 0.6 * p; }
      else if (b.inField && b.eligible) stretch = 0.25 * (1 - Math.min(1, dd / (gravR * z)));
      else if (!b.eligible && dd < gravR * z * 0.9) { const k = 1 - dd / (gravR * z * 0.9); bx += Math.sin(t * 28 + b.seed) * br * 0.05 * k; by += Math.cos(t * 23 + b.seed) * br * 0.05 * k; }
      const ang = Math.atan2(dpy, dpx);
      if (b.type === "dust") {
        const rr = Math.max(0.9, br * scale);
        ctx.fillStyle = b.seed % 3 ? "#bdf3ff" : "#ffffff";
        if (!red) { ctx.globalAlpha = 0.25; ctx.beginPath(); ctx.arc(bx, by, rr * 2.6, 0, TAU); ctx.fill(); }
        ctx.globalAlpha = 0.95; ctx.beginPath(); ctx.arc(bx, by, rr, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
        if (b.absorbing || (b.inField && b.eligible)) {
          ctx.strokeStyle = "#bdf3ff"; ctx.globalAlpha = 0.4; ctx.lineWidth = rr;
          ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx - Math.cos(ang) * rr * 5, by - Math.sin(ang) * rr * 5); ctx.stroke(); ctx.globalAlpha = 1;
        }
      } else if (b.sprite) {
        const s = b.sprite; const k = (b.r / s.R) * z * scale;
        ctx.save(); ctx.translate(bx, by);
        if (stretch > 0) { ctx.rotate(ang); ctx.scale(1 + stretch, 1 - stretch * 0.45); ctx.rotate(-ang); }
        if (def.tier >= 2 && !red) this.starFx(b, k * s.R, t);
        ctx.rotate(b.rot);
        const size = s.c.width * k;
        ctx.drawImage(s.c, -size / 2, -size / 2, size, size);
        ctx.restore();
      }
      // eligibility indicators (shape + colour, not colour alone)
      if (!b.absorbing && b.type !== "dust") {
        if (!b.eligible && dd < gravR * z * 1.4) {
          const rr = br * 1.25 + 4;
          ctx.strokeStyle = "rgba(255,120,140,0.6)"; ctx.lineWidth = 1.5; ctx.setLineDash([3, 5]);
          ctx.beginPath(); ctx.arc(bx, by, rr, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
          this.lock(bx + rr * 0.72, by - rr * 0.72, Math.max(7, Math.min(12, br * 0.35)));
        } else if (b.eligible && (b.inField || (this.highlight && dd < Math.min(w, h) * 0.5))) {
          const pulse = this.highlight ? 0.5 + 0.5 * Math.sin(t * 6) : 0.5;
          ctx.strokeStyle = this.skin.mid; ctx.globalAlpha = 0.3 + 0.4 * pulse; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.arc(bx, by, br * 1.2 + 3, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1;
        }
      } else if (this.highlight && b.eligible && b.type === "dust" && dd < Math.min(w, h) * 0.45) {
        ctx.strokeStyle = this.skin.mid; ctx.globalAlpha = 0.4 + 0.4 * Math.sin(t * 6); ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(bx, by, 7, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1;
      }
    }

    // rings
    for (const r of this.rings) {
      const p = r.life / r.dur; const rad = (r.r + (r.max - r.r) * (1 - Math.pow(1 - p, 3))) * z;
      ctx.strokeStyle = r.color; ctx.globalAlpha = (1 - p) * 0.8; ctx.lineWidth = r.width * (1 - p) + 0.5;
      ctx.beginPath(); ctx.arc(cx + r.x * z, cy + r.y * z, rad, 0, TAU); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // particles
    ctx.globalCompositeOperation = "lighter";
    for (const p of this.particles) {
      ctx.globalAlpha = p.life / p.max; ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(cx + p.x * z, cy + p.y * z, Math.max(0.6, p.size * Math.max(0.5, z * 1.5)), 0, TAU); ctx.fill();
    }
    ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1;

    drawBlackHole(ctx, px, py, pr * z * (1 + this.pulse * 0.06), t, this.skin, red, this.pulse * 0.6);

    // floating texts
    ctx.textAlign = "center";
    for (const tx of this.texts) {
      if (tx.life < 0) continue;
      const p = tx.life / 1.3;
      ctx.globalAlpha = 1 - p * p;
      ctx.font = `${tx.big ? 700 : 600} ${tx.big ? 20 : 13}px Sora, system-ui, sans-serif`;
      ctx.fillStyle = tx.color;
      const off = tx.big ? 0 : 18;
      ctx.fillText(tx.text, px, py - pr * z * 1.6 - 14 - p * 40 + off);
    }
    ctx.globalAlpha = 1;
    if (this.flash > 0) { ctx.fillStyle = this.flashColor; ctx.globalAlpha = this.flash * 0.5; ctx.fillRect(0, 0, w, h); ctx.globalAlpha = 1; }
    // vignette
    const v = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
    v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(0,0,10,0.55)");
    ctx.fillStyle = v; ctx.fillRect(0, 0, w, h);
  }

  private starFx(b: Body, R: number, t: number) {
    const ctx = this.ctx;
    if (b.type === "star") {
      const tint = b.sprite!.tint;
      ctx.save(); ctx.rotate(t * 0.15 + b.seed);
      ctx.globalCompositeOperation = "lighter";
      for (let i = 0; i < 8; i++) {
        ctx.rotate(TAU / 8);
        const len = R * (2.1 + 0.4 * Math.sin(t * 2 + i));
        const g = ctx.createLinearGradient(0, 0, len, 0); g.addColorStop(0, tint + "66"); g.addColorStop(1, tint + "00");
        ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, -R * 0.12); ctx.lineTo(len, 0); ctx.lineTo(0, R * 0.12); ctx.fill();
      }
      ctx.restore(); ctx.globalCompositeOperation = "source-over";
    } else if (b.type === "neutronStar") {
      ctx.save(); ctx.rotate(t * 2.2 + b.seed); ctx.globalCompositeOperation = "lighter";
      for (const dir of [1, -1]) {
        const g = ctx.createLinearGradient(0, 0, 0, dir * R * 6); g.addColorStop(0, "rgba(160,220,255,0.7)"); g.addColorStop(1, "rgba(160,220,255,0)");
        ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-R * 0.3, 0); ctx.lineTo(-R * 0.9, dir * R * 6); ctx.lineTo(R * 0.9, dir * R * 6); ctx.lineTo(R * 0.3, 0); ctx.fill();
      }
      ctx.restore(); ctx.globalCompositeOperation = "source-over";
    } else if (b.type === "rare") {
      ctx.save(); ctx.globalCompositeOperation = "lighter";
      ctx.strokeStyle = b.sprite!.tint; ctx.globalAlpha = 0.5 + 0.3 * Math.sin(t * 3); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, R * (1.3 + 0.1 * Math.sin(t * 2)), 0, TAU); ctx.stroke();
      ctx.restore(); ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
    }
  }

  private lock(x: number, y: number, s: number) {
    const ctx = this.ctx;
    ctx.fillStyle = "rgba(20,8,30,0.85)"; ctx.beginPath(); ctx.arc(x, y, s, 0, TAU); ctx.fill();
    ctx.strokeStyle = "#ff8ca0"; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(x, y - s * 0.15, s * 0.3, Math.PI, 0); ctx.stroke();
    ctx.fillStyle = "#ff8ca0"; ctx.fillRect(x - s * 0.42, y - s * 0.12, s * 0.84, s * 0.6);
  }
}
