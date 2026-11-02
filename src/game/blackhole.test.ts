import { describe, expect, it } from "vitest";
import { SKINS } from "./data";
import { drawBlackHole, skinColors } from "./blackhole";

describe("animated skin colors", () => {
  it("keeps animated colors compatible with every renderer's hex alpha suffix", () => {
    const animated = SKINS.filter((skin) => skin.animated);
    expect(animated.length).toBeGreaterThan(0);
    for (const skin of animated) {
      for (const time of [0, 1, 4.778, 100, 10000]) {
        const colors = skinColors(skin, time);
        for (const color of [colors.hot, colors.mid, colors.outer, colors.glow]) {
          expect(color).toMatch(/^#[0-9a-f]{6}$/i);
          for (const alpha of ["00", "22", "66"]) {
            expect(CSS_COLOR.test(color + alpha)).toBe(true);
          }
        }
        const gradient = { addColorStop: (_offset: number, color: string) => {
          if (!CSS_COLOR.test(color)) throw new Error(`Invalid gradient color: ${color}`);
        } };
        const context = new Proxy({}, { get: (_target, key) => key === "createRadialGradient" ? () => gradient : () => {} });
        expect(() => drawBlackHole(context as CanvasRenderingContext2D, 100, 100, 20, time, skin, false)).not.toThrow();
      }
    }
  });
});

const CSS_COLOR = /^#[0-9a-f]{6}([0-9a-f]{2})?$/i;