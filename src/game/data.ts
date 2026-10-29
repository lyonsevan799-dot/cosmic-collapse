// Single source of truth for all tunable game data.

export type ObjType =
  | "dust"
  | "tinyAsteroid"
  | "largeAsteroid"
  | "moon"
  | "smallPlanet"
  | "earthPlanet"
  | "gasGiant"
  | "star"
  | "neutronStar"
  | "rare";

export interface ObjDef {
  type: ObjType;
  name: string;
  plural: string;
  mass: [number, number];
  radius: [number, number];
  /** Player mass required before this object can be absorbed. */
  minMass: number;
  rarity: "common" | "uncommon" | "rare" | "epic";
  /** Base seconds for the absorption spiral. */
  absorbTime: number;
  /** Strength multiplier of gravitational pull. */
  pull: number;
  tier: 0 | 1 | 2 | 3; // feedback tier: 0 small, 1 planet, 2 star, 3 rare
}

export const OBJECTS: Record<ObjType, ObjDef> = {
  dust: { type: "dust", name: "Space Dust", plural: "Space dust", mass: [2, 5], radius: [2, 4], minMass: 0, rarity: "common", absorbTime: 0.18, pull: 1.3, tier: 0 },
  tinyAsteroid: { type: "tinyAsteroid", name: "Tiny Asteroid", plural: "Tiny asteroids", mass: [5, 12], radius: [5, 8], minMass: 14, rarity: "common", absorbTime: 0.28, pull: 1.15, tier: 0 },
  largeAsteroid: { type: "largeAsteroid", name: "Large Asteroid", plural: "Large asteroids", mass: [12, 25], radius: [10, 15], minMass: 45, rarity: "common", absorbTime: 0.4, pull: 1.0, tier: 0 },
  moon: { type: "moon", name: "Moon", plural: "Moons", mass: [20, 45], radius: [14, 20], minMass: 110, rarity: "uncommon", absorbTime: 0.6, pull: 0.95, tier: 1 },
  smallPlanet: { type: "smallPlanet", name: "Rocky Planet", plural: "Rocky planets", mass: [30, 70], radius: [20, 28], minMass: 220, rarity: "uncommon", absorbTime: 0.8, pull: 0.9, tier: 1 },
  earthPlanet: { type: "earthPlanet", name: "Terran World", plural: "Terran worlds", mass: [60, 130], radius: [26, 36], minMass: 420, rarity: "uncommon", absorbTime: 0.95, pull: 0.85, tier: 1 },
  gasGiant: { type: "gasGiant", name: "Gas Giant", plural: "Gas giants", mass: [120, 280], radius: [40, 56], minMass: 800, rarity: "rare", absorbTime: 1.15, pull: 0.8, tier: 1 },
  star: { type: "star", name: "Star", plural: "Stars", mass: [250, 650], radius: [52, 70], minMass: 1500, rarity: "rare", absorbTime: 1.35, pull: 0.75, tier: 2 },
  neutronStar: { type: "neutronStar", name: "Neutron Star", plural: "Neutron stars", mass: [500, 1200], radius: [22, 30], minMass: 2600, rarity: "epic", absorbTime: 1.3, pull: 0.75, tier: 2 },
  rare: { type: "rare", name: "Void Relic", plural: "Void relics", mass: [800, 2000], radius: [60, 85], minMass: 3800, rarity: "epic", absorbTime: 1.6, pull: 0.7, tier: 3 },
};

export const RARE_NAMES = ["Void Prism", "Quasar Seed", "Dark Bloom", "Singing Relic"];

export type ObjectiveKind = "time" | "count" | "bonusMass";
export interface Objective {
  id: string;
  kind: ObjectiveKind;
  label: string;
  value: number;
  type?: ObjType;
  gems: number;
}

export interface LevelDef {
  id: number;
  name: string;
  sector: number;
  sectorName: string;
  theme: string;
  startMass: number;
  target: number;
  weights: Partial<Record<ObjType, number>>;
  density: number; // active object budget
  reward: number; // gems on first clear
  hues: [number, number]; // nebula hues
  objectives: Objective[];
}

const L = (l: Omit<LevelDef, "objectives"> & { objectives: Omit<Objective, "id">[] }): LevelDef => ({
  ...l,
  objectives: l.objectives.map((o, i) => ({ ...o, id: `L${l.id}-${i}` })),
});

export const LEVELS: LevelDef[] = [
  L({ id: 1, name: "First Contact", sector: 1, sectorName: "Asteroid Belt", theme: "A quiet drift of dust and pebbles.", startMass: 10, target: 80, weights: { dust: 70, tinyAsteroid: 30 }, density: 150, reward: 15, hues: [220, 260],
    objectives: [{ kind: "time", label: "Finish in under 60s", value: 60, gems: 5 }, { kind: "count", type: "tinyAsteroid", label: "Absorb 5 tiny asteroids", value: 5, gems: 5 }, { kind: "bonusMass", label: "Reach 95 mass", value: 95, gems: 4 }] }),
  L({ id: 2, name: "The Shattered Belt", sector: 1, sectorName: "Asteroid Belt", theme: "Broken rock tumbles through the dark.", startMass: 25, target: 190, weights: { dust: 30, tinyAsteroid: 45, largeAsteroid: 25 }, density: 120, reward: 20, hues: [235, 285],
    objectives: [{ kind: "time", label: "Finish in under 75s", value: 75, gems: 5 }, { kind: "count", type: "largeAsteroid", label: "Absorb 6 large asteroids", value: 6, gems: 6 }, { kind: "bonusMass", label: "Reach 220 mass", value: 220, gems: 4 }] }),
  L({ id: 3, name: "Moonfall", sector: 2, sectorName: "Lunar Frontier", theme: "Silver moons orbit in the cold.", startMass: 60, target: 380, weights: { dust: 8, tinyAsteroid: 30, largeAsteroid: 37, moon: 25 }, density: 115, reward: 25, hues: [200, 250],
    objectives: [{ kind: "time", label: "Finish in under 90s", value: 90, gems: 6 }, { kind: "count", type: "moon", label: "Absorb 4 moons", value: 4, gems: 6 }, { kind: "bonusMass", label: "Reach 430 mass", value: 430, gems: 5 }] }),
  L({ id: 4, name: "Blue Giant", sector: 2, sectorName: "Lunar Frontier", theme: "First worlds glow beneath a blue sun.", startMass: 130, target: 700, weights: { tinyAsteroid: 10, largeAsteroid: 30, moon: 35, smallPlanet: 25 }, density: 110, reward: 30, hues: [190, 230],
    objectives: [{ kind: "time", label: "Finish in under 100s", value: 100, gems: 6 }, { kind: "count", type: "smallPlanet", label: "Absorb 3 rocky planets", value: 3, gems: 7 }, { kind: "bonusMass", label: "Reach 780 mass", value: 780, gems: 5 }] }),
  L({ id: 5, name: "Planet Eater", sector: 3, sectorName: "Solar System", theme: "Whole worlds await your hunger.", startMass: 260, target: 1150, weights: { largeAsteroid: 8, moon: 30, smallPlanet: 32, earthPlanet: 22, gasGiant: 8 }, density: 105, reward: 40, hues: [160, 220],
    objectives: [{ kind: "time", label: "Finish in under 110s", value: 110, gems: 7 }, { kind: "count", type: "earthPlanet", label: "Absorb 3 terran worlds", value: 3, gems: 7 }, { kind: "bonusMass", label: "Reach 1,300 mass", value: 1300, gems: 6 }] }),
  L({ id: 6, name: "Gravity Well", sector: 3, sectorName: "Solar System", theme: "The pull of giants bends every orbit.", startMass: 450, target: 1750, weights: { moon: 15, smallPlanet: 28, earthPlanet: 32, gasGiant: 25 }, density: 100, reward: 45, hues: [270, 210],
    objectives: [{ kind: "time", label: "Finish in under 120s", value: 120, gems: 7 }, { kind: "count", type: "gasGiant", label: "Absorb 3 gas giants", value: 3, gems: 8 }, { kind: "bonusMass", label: "Reach 2,000 mass", value: 2000, gems: 6 }] }),
  L({ id: 7, name: "Deadlight", sector: 4, sectorName: "Stellar Graveyard", theme: "Dying stars flicker among the ruins.", startMass: 800, target: 2500, weights: { smallPlanet: 10, earthPlanet: 28, gasGiant: 35, star: 22, neutronStar: 5 }, density: 95, reward: 55, hues: [330, 270],
    objectives: [{ kind: "time", label: "Finish in under 130s", value: 130, gems: 8 }, { kind: "count", type: "star", label: "Absorb 2 stars", value: 2, gems: 8 }, { kind: "bonusMass", label: "Reach 2,800 mass", value: 2800, gems: 7 }] }),
  L({ id: 8, name: "Quasar Fields", sector: 4, sectorName: "Stellar Graveyard", theme: "Pulsars sweep beams across the void.", startMass: 1200, target: 3500, weights: { smallPlanet: 8, earthPlanet: 15, gasGiant: 33, star: 32, neutronStar: 12 }, density: 92, reward: 65, hues: [300, 200],
    objectives: [{ kind: "time", label: "Finish in under 140s", value: 140, gems: 8 }, { kind: "count", type: "neutronStar", label: "Absorb a neutron star", value: 1, gems: 9 }, { kind: "bonusMass", label: "Reach 4,000 mass", value: 4000, gems: 7 }] }),
  L({ id: 9, name: "Last Light", sector: 5, sectorName: "Galactic Core", theme: "The densest stars burn their final fire.", startMass: 1800, target: 4800, weights: { earthPlanet: 8, gasGiant: 28, star: 40, neutronStar: 18, rare: 6 }, density: 90, reward: 80, hues: [20, 300],
    objectives: [{ kind: "time", label: "Finish in under 150s", value: 150, gems: 9 }, { kind: "count", type: "rare", label: "Absorb a Void Relic", value: 1, gems: 10 }, { kind: "bonusMass", label: "Reach 5,400 mass", value: 5400, gems: 8 }] }),
  L({ id: 10, name: "Singularity Zero", sector: 5, sectorName: "Galactic Core", theme: "Consume the heart of the galaxy.", startMass: 2600, target: 6500, weights: { earthPlanet: 6, gasGiant: 22, star: 38, neutronStar: 22, rare: 12 }, density: 90, reward: 120, hues: [40, 280],
    objectives: [{ kind: "time", label: "Finish in under 170s", value: 170, gems: 10 }, { kind: "count", type: "rare", label: "Absorb 2 Void Relics", value: 2, gems: 12 }, { kind: "bonusMass", label: "Reach 7,500 mass", value: 7500, gems: 10 }] }),
];

export const DEMO_LEVEL: LevelDef = { ...LEVELS[4], id: 0, name: "Demo", weights: { dust: 10, tinyAsteroid: 20, largeAsteroid: 25, moon: 20, smallPlanet: 15, earthPlanet: 7, gasGiant: 3 }, density: 90, startMass: 300, target: 1e9, hues: [250, 200] };

export type UpgradeId = "gravity" | "growth" | "speed" | "efficiency";
export interface UpgradeDef { id: UpgradeId; name: string; desc: string; costs: number[]; per: number; }
export const UPGRADES: UpgradeDef[] = [
  { id: "gravity", name: "Gravity Radius", desc: "Eligible objects start falling in from farther away.", costs: [20, 40, 70, 110, 160], per: 0.12 },
  { id: "growth", name: "Growth Bonus", desc: "Gain more mass from every absorption.", costs: [25, 50, 85, 130, 190], per: 0.07 },
  { id: "speed", name: "Movement Speed", desc: "Raises your top speed through space.", costs: [20, 40, 70, 110, 160], per: 0.07 },
  { id: "efficiency", name: "Absorption Efficiency", desc: "Speeds up the final inward spiral.", costs: [40, 90, 150], per: 0.15 },
];

export interface Skin {
  id: string;
  name: string;
  hot: string;
  mid: string;
  outer: string;
  glow: string;
  price: number;
  unlock: "default" | "gems" | "campaign";
  animated?: boolean;
}
export const SKINS: Skin[] = [
  { id: "horizon", name: "Event Horizon", hot: "#e6fbff", mid: "#38d9f5", outer: "#9b5cff", glow: "#4fb8ff", price: 0, unlock: "default" },
  { id: "violet", name: "Violet Nebula", hot: "#f3e6ff", mid: "#a86bff", outer: "#4b3bd6", glow: "#8a5cff", price: 50, unlock: "gems" },
  { id: "solar", name: "Solar Flare", hot: "#fff6d6", mid: "#ffc341", outer: "#ff6a1f", glow: "#ff9a3c", price: 70, unlock: "gems" },
  { id: "emerald", name: "Emerald Void", hot: "#e8fff4", mid: "#34e89e", outer: "#1fb8c9", glow: "#2fd6a8", price: 80, unlock: "gems" },
  { id: "rose", name: "Rose Quasar", hot: "#fff0f7", mid: "#ff6fb5", outer: "#b38cff", glow: "#ff8ccf", price: 100, unlock: "gems" },
  { id: "frozen", name: "Frozen Singularity", hot: "#ffffff", mid: "#bfeaff", outer: "#6fb6ff", glow: "#d6f2ff", price: 120, unlock: "gems" },
  { id: "crimson", name: "Crimson Collapse", hot: "#ffe6e6", mid: "#ff3b5c", outer: "#7a2cff", glow: "#ff3b6b", price: 150, unlock: "gems" },
  { id: "crown", name: "Galactic Crown", hot: "#ffffff", mid: "#ff6fb5", outer: "#38d9f5", glow: "#ffd36b", price: 0, unlock: "campaign", animated: true },
];

export const MILESTONES: { mass: number; gems: number }[] = [
  { mass: 100, gems: 2 }, { mass: 250, gems: 3 }, { mass: 500, gems: 3 }, { mass: 1000, gems: 4 },
  { mass: 2000, gems: 5 }, { mass: 3500, gems: 6 }, { mass: 5000, gems: 8 }, { mass: 6500, gems: 10 },
];

export const PLAYER = {
  baseSpeed: 230,
  accel: 8,
  decel: 5,
  gravityMult: 3.1,
  campaignBonus: 60,
  replayFraction: 0.25,
  rareGem: 2,
};
