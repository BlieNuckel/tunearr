import { useEffect, useState } from "react";
import { dominantHue, type ImageHue } from "@/utils/imageColor";

type Result = { url: string; hue: ImageHue | null };

const SAMPLE_SIZE = 32;

const cache = new Map<string, Promise<ImageHue | null>>();

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    // Without CORS the canvas is tainted and its pixels cannot be read.
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Could not load ${url}`));
    image.src = url;
  });
}

function samplePixels(image: HTMLImageElement): Uint8ClampedArray | null {
  const canvas = document.createElement("canvas");
  canvas.width = SAMPLE_SIZE;
  canvas.height = SAMPLE_SIZE;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return null;
  context.drawImage(image, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
  try {
    return context.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE).data;
  } catch {
    return null;
  }
}

async function readHue(url: string): Promise<ImageHue | null> {
  try {
    const pixels = samplePixels(await loadImage(url));
    return pixels ? dominantHue(pixels) : null;
  } catch {
    return null;
  }
}

/** One read per image for the whole session, shared by every card showing it. */
export function loadImageHue(url: string): Promise<ImageHue | null> {
  let pending = cache.get(url);
  if (!pending) {
    pending = readHue(url);
    cache.set(url, pending);
  }
  return pending;
}

export function clearImageHueCache(): void {
  cache.clear();
}

/** The dominant hue of an image, or null until it is known or if it cannot be read. */
export default function useImageHue(url: string | null): ImageHue | null {
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    void loadImageHue(url).then((hue) => {
      if (!cancelled) setResult({ url, hue });
    });
    return () => {
      cancelled = true;
    };
  }, [url]);

  return result !== null && result.url === url ? result.hue : null;
}
