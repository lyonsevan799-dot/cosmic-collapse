import { describe, expect, it } from "vitest";
import { LEVELS } from "./data";
import { canAbsorb, claimMilestone, completeLevel, defaultSave, isLevelPlayable, purchaseSkin, purchaseUpgrade, validateSave } from "./logic";

const stats = (mass: number, time = 999) => ({ mass, time, counts: {} });

describe("game rules", () => {
  it("tiny black hole cannot absorb a gas giant but can absorb dust", () => {
    expect(canAbsorb(10, "gasGiant")).toBe(false);
    expect(canAbsorb(10, "dust")).toBe(true);
  });
  it("upgrade purchase never makes gems negative", () => {
    const s = { ...defaultSave(), gems: 10 };
    expect(purchaseUpgrade(s, "gravity")).toBeNull();
    const ok = purchaseUpgrade({ ...s, gems: 20 }, "gravity")!;
    expect(ok.gems).toBe(0);
    expect(ok.upgrades.gravity).toBe(1);
  });
  it("level reward full on first clear, reduced on replay, and unlocks next", () => {
    const first = completeLevel(defaultSave(), 0, stats(80));
    expect(first.lines[0].gems).toBe(LEVELS[0].reward);
    expect(first.save.highestUnlocked).toBe(1);
    const again = completeLevel(first.save, 0, stats(80));
    expect(again.lines[0].gems).toBeLessThan(LEVELS[0].reward);
  });
  it("optional objectives pay only once", () => {
    const a = completeLevel(defaultSave(), 0, stats(100, 30));
    const b = completeLevel(a.save, 0, stats(100, 30));
    expect(b.objectivesDone.every((o) => !o.isNew)).toBe(true);
  });
  it("milestones are claimed once", () => {
    const r = claimMilestone(defaultSave(), 120)!;
    expect(r.milestone).toBe(100);
    expect(claimMilestone(r.save, 120)).toBeNull();
  });
  it("locked levels are not playable", () => {
    expect(isLevelPlayable(defaultSave(), 1)).toBe(false);
    expect(isLevelPlayable(defaultSave(), 0)).toBe(true);
  });
  it("campaign skin cannot be bought with gems", () => {
    expect(purchaseSkin({ ...defaultSave(), gems: 9999 }, "crown")).toBeNull();
  });
  it("completing final level unlocks crown", () => {
    const s = { ...defaultSave(), highestUnlocked: 9 };
    expect(completeLevel(s, 9, stats(6500)).save.skinsOwned).toContain("crown");
  });
  it("malformed save keeps valid fields", () => {
    const s = validateSave({ gems: 55, upgrades: "bad", skin: "nope", completed: [0, 1, 99] });
    expect(s.gems).toBe(55);
    expect(s.skin).toBe("horizon");
    expect(s.completed).toEqual([0, 1]);
    expect(s.highestUnlocked).toBe(2);
    expect(validateSave("garbage").gems).toBe(0);
  });
});
