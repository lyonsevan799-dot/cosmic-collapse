// Pure game rules: save validation, eligibility, upgrades, rewards. No DOM here.
import { LEVELS, MILESTONES, OBJECTS, PLAYER, SKINS, UPGRADES, type ObjType, type UpgradeId } from "./data";

export const SAVE_VERSION = 1;
export const SAVE_KEY = "cosmic-collapse-save";

export interface Settings { audio: boolean; sfx: number; music: number; shake: boolean; reduced: boolean; }
export interface SaveData {
  version: number;
  highestUnlocked: number; // index into LEVELS
  completed: number[]; // level indices
  bestTimes: Record<string, number>;
  gems: number;
  upgrades: Record<UpgradeId, number>;
  skinsOwned: string[];
  skin: string;
  settings: Settings;
  tutorialDone: boolean;
  objectives: string[];
  milestones: number[];
  campaignDone: boolean;
}

export const defaultSave = (): SaveData => ({
  version: SAVE_VERSION,
  highestUnlocked: 0,
  completed: [],
  bestTimes: {},
  gems: 0,
  upgrades: { gravity: 0, growth: 0, speed: 0, efficiency: 0 },
  skinsOwned: ["horizon"],
  skin: "horizon",
  settings: { audio: true, sfx: 0.7, music: 0.4, shake: true, reduced: false },
  tutorialDone: false,
  objectives: [],
  milestones: [],
  campaignDone: false,
});

const num = (v: unknown, d: number, min = -Infinity, max = Infinity) =>
  typeof v === "number" && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : d;
const bool = (v: unknown, d: boolean) => (typeof v === "boolean" ? v : d);
const strArr = (v: unknown, d: string[]) => (Array.isArray(v) ? v.filter((x) => typeof x === "string") : d);

/** Validate a parsed save field-by-field, keeping every valid field. */
export function validateSave(raw: unknown): SaveData {
  const d = defaultSave();
  if (!raw || typeof raw !== "object") return d;
  const r = raw as Record<string, any>;
  const maxLvl = LEVELS.length - 1;
  const completed = Array.isArray(r.completed)
    ? [...new Set(r.completed.filter((x: unknown) => Number.isInteger(x) && (x as number) >= 0 && (x as number) <= maxLvl))] as number[]
    : d.completed;
  const ups = { ...d.upgrades };
  if (r.upgrades && typeof r.upgrades === "object") {
    for (const u of UPGRADES) ups[u.id] = Math.round(num(r.upgrades[u.id], 0, 0, u.costs.length));
  }
  const owned = strArr(r.skinsOwned, d.skinsOwned).filter((s) => SKINS.some((k) => k.id === s));
  if (!owned.includes("horizon")) owned.unshift("horizon");
  const skin = typeof r.skin === "string" && owned.includes(r.skin) ? r.skin : "horizon";
  const s = r.settings && typeof r.settings === "object" ? r.settings : {};
  const bestTimes: Record<string, number> = {};
  if (r.bestTimes && typeof r.bestTimes === "object") {
    for (const [k, v] of Object.entries(r.bestTimes)) if (typeof v === "number" && v > 0) bestTimes[k] = v;
  }
  let highest = Math.round(num(r.highestUnlocked, 0, 0, maxLvl));
  for (const c of completed) highest = Math.max(highest, Math.min(maxLvl, c + 1));
  return {
    version: SAVE_VERSION,
    highestUnlocked: highest,
    completed,
    bestTimes,
    gems: Math.floor(num(r.gems, 0, 0, 1e7)),
    upgrades: ups,
    skinsOwned: owned,
    skin,
    settings: {
      audio: bool(s.audio, d.settings.audio),
      sfx: num(s.sfx, d.settings.sfx, 0, 1),
      music: num(s.music, d.settings.music, 0, 1),
      shake: bool(s.shake, d.settings.shake),
      reduced: bool(s.reduced, d.settings.reduced),
    },
    tutorialDone: bool(r.tutorialDone, false),
    objectives: strArr(r.objectives, []),
    milestones: Array.isArray(r.milestones) ? r.milestones.filter((x: unknown) => typeof x === "number") : [],
    campaignDone: bool(r.campaignDone, false) || completed.includes(maxLvl),
  };
}

export function radiusForMass(m: number) { return 6 + 2 * Math.sqrt(Math.max(0, m)); }
export function canAbsorb(playerMass: number, type: ObjType) { return playerMass >= OBJECTS[type].minMass; }

export function upgradeMult(save: Pick<SaveData, "upgrades">, id: UpgradeId) {
  const def = UPGRADES.find((u) => u.id === id)!;
  return 1 + def.per * (save.upgrades[id] ?? 0);
}

export function upgradeCost(save: SaveData, id: UpgradeId): number | null {
  const def = UPGRADES.find((u) => u.id === id)!;
  const tier = save.upgrades[id];
  return tier >= def.costs.length ? null : def.costs[tier];
}

/** Returns new save, or null when maxed / unaffordable. Never goes negative. */
export function purchaseUpgrade(save: SaveData, id: UpgradeId): SaveData | null {
  const cost = upgradeCost(save, id);
  if (cost === null || save.gems < cost) return null;
  return { ...save, gems: save.gems - cost, upgrades: { ...save.upgrades, [id]: save.upgrades[id] + 1 } };
}

export function purchaseSkin(save: SaveData, skinId: string): SaveData | null {
  const skin = SKINS.find((s) => s.id === skinId);
  if (!skin || save.skinsOwned.includes(skinId) || skin.unlock !== "gems" || save.gems < skin.price) return null;
  return { ...save, gems: save.gems - skin.price, skinsOwned: [...save.skinsOwned, skinId], skin: skinId };
}

export interface RunStats { mass: number; time: number; counts: Partial<Record<ObjType, number>>; }
export interface RewardLine { label: string; gems: number; }
export interface LevelResult { save: SaveData; lines: RewardLine[]; total: number; objectivesDone: { label: string; done: boolean; isNew: boolean }[]; firstClear: boolean; campaignFinished: boolean; }

export function objectiveMet(o: { kind: string; value: number; type?: ObjType }, stats: RunStats) {
  if (o.kind === "time") return stats.time <= o.value;
  if (o.kind === "count") return (stats.counts[o.type!] ?? 0) >= o.value;
  return stats.mass >= o.value;
}

/** Apply a level completion. Base reward full on first clear, reduced on replay; objectives once ever. */
export function completeLevel(save: SaveData, levelIndex: number, stats: RunStats): LevelResult {
  const lvl = LEVELS[levelIndex];
  const firstClear = !save.completed.includes(levelIndex);
  const lines: RewardLine[] = [];
  const base = firstClear ? lvl.reward : Math.max(1, Math.round(lvl.reward * PLAYER.replayFraction));
  lines.push({ label: firstClear ? "Sector cleared" : "Replay reward", gems: base });
  const newObj = [...save.objectives];
  const objectivesDone = lvl.objectives.map((o) => {
    const done = objectiveMet(o, stats);
    const isNew = done && !newObj.includes(o.id);
    if (isNew) { newObj.push(o.id); lines.push({ label: o.label, gems: o.gems }); }
    return { label: o.label, done, isNew };
  });
  const rares = Math.min(5, stats.counts.rare ?? 0);
  if (rares > 0) lines.push({ label: `Void relics x${rares}`, gems: rares * PLAYER.rareGem });
  const last = levelIndex === LEVELS.length - 1;
  const campaignFinished = last && !save.campaignDone;
  if (campaignFinished) lines.push({ label: "Campaign complete", gems: PLAYER.campaignBonus });
  const total = lines.reduce((a, l) => a + l.gems, 0);
  const key = String(levelIndex);
  const best = save.bestTimes[key];
  const skinsOwned = campaignFinished && !save.skinsOwned.includes("crown") ? [...save.skinsOwned, "crown"] : save.skinsOwned;
  return {
    firstClear, campaignFinished, lines, total, objectivesDone,
    save: {
      ...save,
      gems: save.gems + total,
      completed: firstClear ? [...save.completed, levelIndex] : save.completed,
      highestUnlocked: Math.max(save.highestUnlocked, Math.min(LEVELS.length - 1, levelIndex + 1)),
      bestTimes: { ...save.bestTimes, [key]: best ? Math.min(best, stats.time) : stats.time },
      objectives: newObj,
      campaignDone: save.campaignDone || last,
      skinsOwned,
    },
  };
}

/** Claim mass milestone gems; each milestone only once ever. */
export function claimMilestone(save: SaveData, mass: number): { save: SaveData; gems: number; milestone: number } | null {
  const m = MILESTONES.find((x) => mass >= x.mass && !save.milestones.includes(x.mass));
  if (!m) return null;
  return { save: { ...save, gems: save.gems + m.gems, milestones: [...save.milestones, m.mass] }, gems: m.gems, milestone: m.mass };
}

export function isLevelPlayable(save: SaveData, index: number) { return index >= 0 && index <= save.highestUnlocked && index < LEVELS.length; }

// ---------- storage ----------
let memoryStore: string | null = null;
export let storageAvailable = true;
export function loadSave(): SaveData {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    return validateSave(raw ? JSON.parse(raw) : null);
  } catch {
    storageAvailable = false;
    try { return validateSave(memoryStore ? JSON.parse(memoryStore) : null); } catch { return defaultSave(); }
  }
}
export function writeSave(save: SaveData) {
  const s = JSON.stringify(save);
  memoryStore = s;
  try { window.localStorage.setItem(SAVE_KEY, s); } catch { storageAvailable = false; }
}
