import { albumSurface, dominantHue } from "../imageColor";

type Rgba = [number, number, number, number?];

const FIRST_HUE_BAND = 15;

function pixels(...runs: [Rgba, number][]): Uint8ClampedArray {
  const bytes: number[] = [];
  for (const [[r, g, b, a = 255], count] of runs) {
    for (let i = 0; i < count; i++) bytes.push(r, g, b, a);
  }
  return new Uint8ClampedArray(bytes);
}

describe("dominantHue", () => {
  it("names a blue cover blue", () => {
    const hue = dominantHue(pixels([[30, 60, 200], 100]));

    expect(hue!.hue).toBeGreaterThan(220);
    expect(hue!.hue).toBeLessThan(235);
    expect(hue!.saturation).toBeGreaterThan(0.6);
  });

  it("reads a red that wraps around zero degrees", () => {
    const hue = dominantHue(pixels([[200, 30, 30], 100]));
    expect(hue!.hue).toBeLessThan(FIRST_HUE_BAND);
  });

  it("calls a grey cover grey", () => {
    expect(dominantHue(pixels([[120, 120, 120], 100]))).toEqual({
      hue: 0,
      saturation: 0,
    });
  });

  it("keeps a black-and-white cover grey despite a small coloured logo", () => {
    const hue = dominantHue(
      pixels([[20, 20, 20], 60], [[240, 240, 240], 37], [[220, 20, 20], 3])
    );
    expect(hue).toEqual({ hue: 0, saturation: 0 });
  });

  it("lets a saturated area outweigh a larger washed-out one", () => {
    const hue = dominantHue(
      pixels([[200, 205, 225], 60], [[230, 120, 20], 40])
    );
    expect(hue!.hue).toBeGreaterThan(20);
    expect(hue!.hue).toBeLessThan(40);
  });

  it("ignores transparent pixels", () => {
    expect(dominantHue(pixels([[30, 60, 200, 0], 100]))).toBeNull();
    expect(dominantHue(new Uint8ClampedArray())).toBeNull();
  });
});

describe("albumSurface", () => {
  it("is pale in light mode and deep in dark mode, in the cover's hue", () => {
    expect(albumSurface({ hue: 225.4, saturation: 0.5 })).toEqual({
      light: "hsl(225 30% 88%)",
      dark: "hsl(225 23% 20%)",
    });
  });

  it("caps how colourful a vivid cover can make the card", () => {
    expect(albumSurface({ hue: 10, saturation: 1 })).toEqual({
      light: "hsl(10 45% 88%)",
      dark: "hsl(10 32% 20%)",
    });
  });

  it("gives a grey cover a neutral card", () => {
    expect(albumSurface({ hue: 0, saturation: 0 })).toEqual({
      light: "hsl(0 0% 88%)",
      dark: "hsl(0 0% 20%)",
    });
  });
});
