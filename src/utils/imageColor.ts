export type ImageHue = {
  /** Degrees, 0 to 360. */
  hue: number;
  /** 0 to 1. Zero for an image with no colour worth naming. */
  saturation: number;
};

export type AlbumSurface = {
  light: string;
  dark: string;
};

type Hsl = { h: number; s: number; l: number };

type HueBin = { weight: number; hueSum: number; saturationSum: number };

const BIN_DEGREES = 15;
const BIN_COUNT = 360 / BIN_DEGREES;

/** Below this a pixel is grey enough that its hue is noise. */
const MIN_PIXEL_CHROMA = 0.08;

/**
 * Share of the image that has to carry colour for it to count as coloured. A
 * black-and-white cover with a small red logo should still read as grey.
 */
const MIN_COLOURED_SHARE = 0.06;

function rgbToHsl(r: number, g: number, b: number): Hsl {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const delta = max - min;
  if (delta === 0) return { h: 0, s: 0, l };

  const s = delta / (1 - Math.abs(2 * l - 1));
  let h: number;
  if (max === rn) h = ((gn - bn) / delta) % 6;
  else if (max === gn) h = (bn - rn) / delta + 2;
  else h = (rn - gn) / delta + 4;
  return { h: (h * 60 + 360) % 360, s, l };
}

function emptyBins(): HueBin[] {
  return Array.from({ length: BIN_COUNT }, () => ({
    weight: 0,
    hueSum: 0,
    saturationSum: 0,
  }));
}

/**
 * The colour a cover reads as. Pixels vote for their hue in proportion to
 * how colourful they are, so a small saturated area outweighs a large washed
 * out one, and the winning hue band is averaged.
 *
 * @param pixels RGBA bytes, as from `ImageData.data`.
 */
export function dominantHue(pixels: Uint8ClampedArray): ImageHue | null {
  const bins = emptyBins();
  let opaque = 0;
  let coloured = 0;

  for (let i = 0; i + 3 < pixels.length; i += 4) {
    if (pixels[i + 3] < 128) continue;
    opaque += 1;
    const { h, s, l } = rgbToHsl(pixels[i], pixels[i + 1], pixels[i + 2]);
    const chroma = s * (1 - Math.abs(2 * l - 1));
    if (chroma < MIN_PIXEL_CHROMA) continue;
    coloured += 1;
    const bin = bins[Math.floor(h / BIN_DEGREES) % BIN_COUNT];
    bin.weight += chroma;
    bin.hueSum += h * chroma;
    bin.saturationSum += s * chroma;
  }

  if (opaque === 0) return null;
  if (coloured / opaque < MIN_COLOURED_SHARE) return { hue: 0, saturation: 0 };

  const best = bins.reduce((a, b) => (b.weight > a.weight ? b : a));
  return {
    hue: best.hueSum / best.weight,
    saturation: best.saturationSum / best.weight,
  };
}

function hsl(hue: number, saturation: number, lightness: number): string {
  return `hsl(${Math.round(hue)} ${Math.round(saturation * 100)}% ${lightness}%)`;
}

/**
 * A card background in the cover's colour, toned down so text stays readable:
 * pale in light mode, deep in dark mode, and never louder than a pastel.
 */
export function albumSurface({ hue, saturation }: ImageHue): AlbumSurface {
  return {
    light: hsl(hue, Math.min(saturation * 0.6, 0.45), 88),
    dark: hsl(hue, Math.min(saturation * 0.45, 0.32), 20),
  };
}
