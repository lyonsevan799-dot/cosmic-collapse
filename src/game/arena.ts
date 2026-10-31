// AI Arena: bot identities, personalities, steering decisions, leaderboard, spatial index.
// Pure logic — no DOM, no networking. All opponents are simulated locally in the browser.
import { SKINS, type Skin } from "./data";

export type Personality = "aggressive" | "explorer" | "collector" | "competitive" | "sneaky" | "balanced";

export interface Bot {
  id: number;
  name: string;
  skin: Skin;
  x: number; y: number; vx: number; vy: number;
  mass: number;
  /** Smoothed display mass so growth animates instead of jumping. */
  disp: number;
  personality: Personality;
  /** Movement speed multiplier (0.8–1.15). */
  speed: number;
  /** Seconds until the next AI decision (staggered for performance). */
  thinkT: number;
  mode: "wander" | "food" | "hunt" | "flee";
  /** Steering target. */
  tx: number; ty: number;
  /** Body the bot is currently trying to eat (engine-owned reference). */
  foodRef: unknown;
  alive: boolean;
  respawnT: number;
  dying: boolean; dieT: number; dieDur: number;
  eater: Bot | "player" | null;
  /** Wobble phase for organic movement. */
  wob: number;
}

export const ARENA = {
  worldRadius: 42000,
  /** Cosmic bodies kept alive across the whole arena. */
  density: 340,
  respawnMin: 3,
  respawnMax: 6,
  /** A hole must be this much more massive to eat another hole. */
  eatRatio: 1.12,
  /** Food sense radius = bot radius × this. */
  senseMult: 26,
} as const;

export const BOT_COUNT_OPTIONS = [25, 50, 75, 100];

export const PERSONALITIES: Record<
  Personality,
  { hunt: number; food: number; flee: number; wander: number; mistake: number; react: [number, number] }
> = {
  aggressive: { hunt: 0.9, food: 0.5, flee: 0.55, wander: 0.2, mistake: 0.1, react: [0.15, 0.35] },
  explorer: { hunt: 0.25, food: 0.6, flee: 0.7, wander: 0.9, mistake: 0.12, react: [0.25, 0.5] },
  collector: { hunt: 0.15, food: 1.0, flee: 0.7, wander: 0.3, mistake: 0.1, react: [0.2, 0.45] },
  competitive: { hunt: 0.7, food: 0.6, flee: 0.8, wander: 0.3, mistake: 0.06, react: [0.12, 0.3] },
  sneaky: { hunt: 0.2, food: 0.7, flee: 1.0, wander: 0.5, mistake: 0.08, react: [0.2, 0.4] },
  balanced: { hunt: 0.5, food: 0.7, flee: 0.7, wander: 0.5, mistake: 0.12, react: [0.2, 0.45] },
};
export const PERSONALITY_LIST = Object.keys(PERSONALITIES) as Personality[];

const NAME_A = ["Nova", "Void", "Galaxy", "Cosmic", "Star", "Nebula", "Quasar", "Astro", "Lunar", "Solar", "Dark", "Hyper", "Omega", "Zero", "Echo", "Flux", "Astra", "Pulsar", "Comet", "Orbit"];
const NAME_B = ["King", "Hunter", "Eater", "Lord", "Walker", "Drift", "Prime", "Reaper", "Wolf", "Fox", "Byte", "Storm", "Shadow", "Blaze", "Titan", "Wisp", "Rider", "Maw", "Sage", "Ghost"];

/** Unique randomized arena names like "NovaKing" or "VoidHunter". */
export function makeBotName(rand: () => number, used: Set<string>): string {
  for (let i = 0; i < 40; i++) {
    const n = NAME_A[Math.floor(rand() * NAME_A.length)] + NAME_B[Math.floor(rand() * NAME_B.length)];
    if (!used.has(n)) {
      used.add(n);
      return n;
    }
  }
  let n = "";
  do {
    n = "Drifter" + Math.floor(rand() * 1000);
  } while (used.has(n));
  used.add(n);
  return n;
}

export function pickPersonality(rand: () => number): Personality {
  return PERSONALITY_LIST[Math.floor(rand() * PERSONALITY_LIST.length) % PERSONALITY_LIST.length];
}

/** Log-uniform starting mass: most bots near the player, a few far stronger. */
export function botStartMass(rand: () => number, playerMass: number): number {
  const lo = Math.log(6);
  const hi = Math.log(Math.max(60, playerMass * 40));
  return Math.min(400, Math.max(6, Math.exp(lo + rand() * (hi - lo))));
}

/** A black hole can eat another hole only when clearly more massive. */
export function canEat(attackerMass: number, victimMass: number): boolean {
  return attackerMass >= victimMass * ARENA.eatRatio;
}

/** Random point in the world disc, at least minDist away from (px, py). */
export function spawnPosAwayFrom(rand: () => number, px: number, py: number, minDist: number, worldR: number) {
  for (let i = 0; i < 24; i++) {
    const a = rand() * Math.PI * 2;
    const d = Math.sqrt(rand()) * worldR;
    const x = Math.cos(a) * d;
    const y = Math.sin(a) * d;
    if (Math.hypot(x - px, y - py) >= minDist) return { x, y };
  }
  const a = rand() * Math.PI * 2;
  return { x: px + Math.cos(a) * minDist, y: py + Math.sin(a) * minDist };
}

export interface BotSenses {
  threat: { x: number; y: number } | null;
  prey: { x: number; y: number } | null;
  food: { x: number; y: number } | null;
}

/** Choose a steering target from what the bot senses. Personality weights the choice; mistakes happen. */
export function decide(bot: Bot, s: BotSenses, rand: () => number, worldR: number) {
  const P = PERSONALITIES[bot.personality];
  // drift back toward the middle near the world edge
  if (Math.hypot(bot.x, bot.y) > worldR * 0.92) {
    bot.mode = "wander";
    bot.tx = -bot.x * 0.4;
    bot.ty = -bot.y * 0.4;
    return;
  }
  if (s.threat && rand() < P.flee * (1 - P.mistake)) {
    bot.mode = "flee";
    const dx = bot.x - s.threat.x;
    const dy = bot.y - s.threat.y;
    const d = Math.hypot(dx, dy) || 1;
    bot.tx = bot.x + (dx / d) * 1500;
    bot.ty = bot.y + (dy / d) * 1500;
    return;
  }
  if (s.prey && rand() < P.hunt * (1 - P.mistake)) {
    bot.mode = "hunt";
    bot.tx = s.prey.x;
    bot.ty = s.prey.y;
    return;
  }
  if (s.food && rand() < P.food) {
    bot.mode = "food";
    bot.tx = s.food.x;
    bot.ty = s.food.y;
    return;
  }
  if (bot.mode !== "wander" || Math.hypot(bot.tx - bot.x, bot.ty - bot.y) < 250 || rand() < P.wander * 0.1) {
    bot.mode = "wander";
    const a = rand() * Math.PI * 2;
    const d = 700 + rand() * 2000;
    bot.tx = bot.x + Math.cos(a) * d;
    bot.ty = bot.y + Math.sin(a) * d;
  }
}

export interface LeaderEntry {
  name: string;
  mass: number;
  isPlayer: boolean;
}

/** Top 10 by mass plus the player's overall rank. */
export function computeLeaderboard(bots: { name: string; mass: number; alive: boolean }[], playerMass: number, playerAlive: boolean) {
  const entries: LeaderEntry[] = [];
  for (const b of bots) if (b.alive) entries.push({ name: b.name, mass: b.mass, isPlayer: false });
  if (playerAlive) entries.push({ name: "You", mass: playerMass, isPlayer: true });
  entries.sort((a, b) => b.mass - a.mass);
  const idx = entries.findIndex((e) => e.isPlayer);
  return { leaders: entries.slice(0, 10), rank: idx < 0 ? entries.length + 1 : idx + 1 };
}

/** Uniform-grid spatial index so bots only compare against nearby objects. */
export class SpatialGrid<T extends { x: number; y: number }> {
  private map = new Map<number, T[]>();
  constructor(public cell: number) {}
  private key(cx: number, cy: number) {
    return (cx + 1024) * 4096 + (cy + 1024);
  }
  clear() {
    for (const a of this.map.values()) a.length = 0;
  }
  insert(o: T) {
    const k = this.key(Math.floor(o.x / this.cell), Math.floor(o.y / this.cell));
    const a = this.map.get(k);
    if (a) a.push(o);
    else this.map.set(k, [o]);
  }
  /** Append all objects in cells overlapping the square (x±r, y±r) to `out`. */
  query(x: number, y: number, r: number, out: T[]) {
    const x0 = Math.floor((x - r) / this.cell);
    const x1 = Math.floor((x + r) / this.cell);
    const y0 = Math.floor((y - r) / this.cell);
    const y1 = Math.floor((y + r) / this.cell);
    for (let cx = x0; cx <= x1; cx++)
      for (let cy = y0; cy <= y1; cy++) {
        const a = this.map.get(this.key(cx, cy));
        if (a) for (const o of a) out.push(o);
      }
    return out;
  }
}

export function randomSkin(rand: () => number): Skin {
  return SKINS[Math.floor(rand() * SKINS.length) % SKINS.length];
}
