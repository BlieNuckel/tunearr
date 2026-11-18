import { renderHook, waitFor } from "@testing-library/react";
import useImageHue, { clearImageHueCache, loadImageHue } from "../useImageHue";

type Outcome = "load" | "error";

const created: FakeImage[] = [];
let outcome: Outcome = "load";

class FakeImage {
  crossOrigin: string | null = null;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  #src = "";

  constructor() {
    created.push(this);
  }

  get src() {
    return this.#src;
  }

  set src(value: string) {
    this.#src = value;
    queueMicrotask(() => (outcome === "load" ? this.onload : this.onerror)?.());
  }
}

const BLUE = new Uint8ClampedArray(
  Array.from({ length: 32 * 32 }, () => [30, 60, 200, 255]).flat()
);

const getImageData = vi.fn(() => ({ data: BLUE }));
const drawImage = vi.fn();

beforeEach(() => {
  clearImageHueCache();
  created.length = 0;
  outcome = "load";
  vi.clearAllMocks();
  vi.stubGlobal("Image", FakeImage);
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
    drawImage,
    getImageData,
  } as never);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("loadImageHue", () => {
  it("reads the image with CORS so its pixels can be sampled", async () => {
    const hue = await loadImageHue("https://caa.test/blue.jpg");

    expect(created[0].crossOrigin).toBe("anonymous");
    expect(created[0].src).toBe("https://caa.test/blue.jpg");
    expect(drawImage).toHaveBeenCalledWith(created[0], 0, 0, 32, 32);
    expect(hue!.hue).toBeGreaterThan(220);
  });

  it("reads each image once", async () => {
    await Promise.all([
      loadImageHue("https://caa.test/blue.jpg"),
      loadImageHue("https://caa.test/blue.jpg"),
    ]);
    expect(created).toHaveLength(1);
  });

  it("gives up quietly when the image does not load", async () => {
    outcome = "error";
    expect(await loadImageHue("https://caa.test/missing.jpg")).toBeNull();
  });

  it("gives up quietly when the canvas will not give its pixels", async () => {
    getImageData.mockImplementationOnce(() => {
      throw new Error("tainted");
    });
    expect(await loadImageHue("https://caa.test/tainted.jpg")).toBeNull();
  });

  it("gives up quietly without a 2D canvas", async () => {
    vi.mocked(HTMLCanvasElement.prototype.getContext).mockReturnValue(null);
    expect(await loadImageHue("https://caa.test/no-canvas.jpg")).toBeNull();
  });
});

describe("useImageHue", () => {
  it("is null until the hue is known", async () => {
    const { result } = renderHook(() =>
      useImageHue("https://caa.test/blue.jpg")
    );
    expect(result.current).toBeNull();

    await waitFor(() => expect(result.current).not.toBeNull());
    expect(result.current!.hue).toBeGreaterThan(220);
  });

  it("does nothing without a url", () => {
    const { result } = renderHook(() => useImageHue(null));

    expect(result.current).toBeNull();
    expect(created).toHaveLength(0);
  });

  it("drops the old hue when the url changes", async () => {
    const { result, rerender } = renderHook(({ url }) => useImageHue(url), {
      initialProps: { url: "https://caa.test/blue.jpg" as string | null },
    });
    await waitFor(() => expect(result.current).not.toBeNull());

    rerender({ url: null });

    expect(result.current).toBeNull();
  });
});
