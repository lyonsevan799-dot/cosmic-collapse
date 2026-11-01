import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Engine } from "./engine";
import { PLAYER, kindAt } from "./data";

vi.mock("./audio", () => ({ sfx: { absorbSmall: vi.fn(), absorbPlanet: vi.fn(), absorbStar: vi.fn() } }));
vi.mock("./sprites", () => ({ getSprite: () => null, VARIANTS: 4, rng: () => () => 0.5 }));
const gradient = { addColorStop: vi.fn() };
const ctx = new Proxy({}, { get: (_target, key) => key === "createRadialGradient" || key === "createLinearGradient" ? () => gradient : () => {} });
const tick = (e: Engine, seconds: number) => {
  for (let t = 0; t < seconds && !e.paused; t += 1 / 60) (e as unknown as { update: (dt: number) => void }).update(1 / 60);
};
let engine: Engine;
beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(ctx as CanvasRenderingContext2D);
  vi.stubGlobal("requestAnimationFrame", () => 0); vi.stubGlobal("cancelAnimationFrame", () => {});
  engine = new Engine(document.createElement("canvas"), {});
});
afterEach(() => { engine.destroy(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("arena simulation", () => {
  it("starts with 100 distinct AI opponents plus the player", () => {
    const onArena = vi.fn(); engine.cb.onArena = onArena; engine.startArena();
    expect(engine.bots).toHaveLength(100);
    expect(new Set(engine.bots.map((b) => b.name)).size).toBe(100);
    expect(engine.bots.every((b) => Math.hypot(b.x, b.y) >= engine.viewRadius() * 0.55)).toBe(true);
    expect(onArena.mock.lastCall?.[0].alive).toBe(101);
  });
  it("moves bots independently and freezes simulation on pause", () => {
    engine.startArena(25); const bot = engine.bots[0];
    const x = bot.x, y = bot.y; tick(engine, 0.5);
    expect(Math.hypot(bot.x - x, bot.y - y)).toBeGreaterThan(0);
    engine.pause(); const time = engine.time; engine.loop(performance.now() + 20);
    expect(engine.time).toBe(time);
  });
  it("awards food to its bot owner once, never to the player", () => {
    engine.startArena(25); const bot = engine.bots[0], body = engine.bodies[0];
    body.kind = kindAt(0); body.mass = 1; body.absorber = bot;
    const before = bot.mass, playerMass = engine.player.mass;
    const consume = (engine as unknown as { consume: (b: typeof body) => void }).consume.bind(engine);
    consume(body); consume(body);
    expect(bot.mass).toBe(before + 1); expect(engine.player.mass).toBe(playerMass);
  });
  it("absorbs another bot once and respawns it after the delay", () => {
    engine.startArena(10);
    engine.bodies = []; engine.player.x = engine.worldR; engine.player.y = 0;
    for (const b of engine.bots) { b.x = -engine.worldR * 0.7; b.y = b.id * 100; b.mass = b.disp = 10; }
    const attacker = engine.bots[0], victim = engine.bots[1];
    attacker.mass = attacker.disp = 100; attacker.x = attacker.y = victim.x = victim.y = 0;
    tick(engine, 0.7);
    expect(victim.alive).toBe(false); expect(attacker.mass).toBe(110);
    tick(engine, 6.5); expect(victim.alive).toBe(true);
  });
  it("eliminates the player, pauses, and emits the killer once", () => {
    const eliminated = vi.fn(); engine.cb.onEliminated = eliminated;
    engine.startArena(10); engine.bodies = [];
    for (const b of engine.bots) { b.x = engine.worldR * 0.7; b.y = b.id * 100; }
    const killer = engine.bots[0]; killer.x = killer.y = 0; killer.mass = killer.disp = 100;
    tick(engine, 0.7);
    expect(engine.playerAlive).toBe(false); expect(engine.paused).toBe(true);
    expect(eliminated).toHaveBeenCalledWith(killer.name); expect(eliminated).toHaveBeenCalledTimes(1);
  });
  it("returns to unchanged endless gameplay", () => {
    engine.startArena(25); engine.startRun(200);
    expect(engine.arena).toBe(false); expect(engine.bots).toHaveLength(0);
    expect(engine.player.mass).toBe(200); expect(engine.bodies).toHaveLength(PLAYER.density);
  });
});