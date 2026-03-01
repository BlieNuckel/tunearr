import { renderHook, act } from "@testing-library/react";

const mockPlay = vi.fn().mockResolvedValue(undefined);
const mockPause = vi.fn();
let mockAudioInstance: {
  src: string;
  paused: boolean;
  play: typeof mockPlay;
  pause: typeof mockPause;
  addEventListener: ReturnType<typeof vi.fn>;
  removeEventListener: ReturnType<typeof vi.fn>;
};
let endedHandler: (() => void) | null = null;

beforeEach(() => {
  endedHandler = null;
  mockAudioInstance = {
    src: "",
    paused: true,
    play: mockPlay,
    pause: mockPause,
    addEventListener: vi.fn((event: string, handler: () => void) => {
      if (event === "ended") endedHandler = handler;
    }),
    removeEventListener: vi.fn(),
  };

  vi.stubGlobal(
    "Audio",
    vi.fn(function () {
      return mockAudioInstance;
    })
  );
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
});

async function loadHook() {
  const mod = await import("../useAudioPreview");
  return mod.default;
}

describe("useAudioPreview", () => {
  it("plays a track when toggle is called", async () => {
    const useAudioPreview = await loadHook();
    const { result } = renderHook(() => useAudioPreview());

    act(() => result.current.toggle("https://example.com/preview.mp3"));

    expect(mockAudioInstance.src).toBe("https://example.com/preview.mp3");
    expect(mockPlay).toHaveBeenCalled();
    expect(
      result.current.isTrackPlaying("https://example.com/preview.mp3")
    ).toBe(true);
  });

  it("pauses when toggling the same track that is playing", async () => {
    const useAudioPreview = await loadHook();
    const { result } = renderHook(() => useAudioPreview());

    act(() => result.current.toggle("https://example.com/preview.mp3"));
    mockAudioInstance.paused = false;

    act(() => result.current.toggle("https://example.com/preview.mp3"));

    expect(mockPause).toHaveBeenCalled();
    expect(
      result.current.isTrackPlaying("https://example.com/preview.mp3")
    ).toBe(false);
  });

  it("switches to a different track", async () => {
    const useAudioPreview = await loadHook();
    const { result } = renderHook(() => useAudioPreview());

    act(() => result.current.toggle("https://example.com/track1.mp3"));
    mockAudioInstance.paused = false;

    act(() => result.current.toggle("https://example.com/track2.mp3"));

    expect(mockAudioInstance.src).toBe("https://example.com/track2.mp3");
    expect(mockPlay).toHaveBeenCalledTimes(2);
    expect(
      result.current.isTrackPlaying("https://example.com/track2.mp3")
    ).toBe(true);
    expect(
      result.current.isTrackPlaying("https://example.com/track1.mp3")
    ).toBe(false);
  });

  it("stops playback", async () => {
    const useAudioPreview = await loadHook();
    const { result } = renderHook(() => useAudioPreview());

    act(() => result.current.toggle("https://example.com/preview.mp3"));

    act(() => result.current.stop());

    expect(mockPause).toHaveBeenCalled();
    expect(mockAudioInstance.src).toBe("");
    expect(
      result.current.isTrackPlaying("https://example.com/preview.mp3")
    ).toBe(false);
  });

  it("resets state when track ends", async () => {
    const useAudioPreview = await loadHook();
    const { result } = renderHook(() => useAudioPreview());

    act(() => result.current.toggle("https://example.com/preview.mp3"));
    expect(
      result.current.isTrackPlaying("https://example.com/preview.mp3")
    ).toBe(true);

    act(() => endedHandler!());

    expect(
      result.current.isTrackPlaying("https://example.com/preview.mp3")
    ).toBe(false);
  });

  it("cleans up audio on unmount when owning playback", async () => {
    const useAudioPreview = await loadHook();
    const { result, unmount } = renderHook(() => useAudioPreview());

    act(() => result.current.toggle("https://example.com/preview.mp3"));
    mockPlay.mockClear();
    mockPause.mockClear();

    unmount();

    expect(mockPause).toHaveBeenCalled();
    expect(mockAudioInstance.src).toBe("");
  });

  it("only one track plays across multiple hook instances", async () => {
    const useAudioPreview = await loadHook();
    const hookA = renderHook(() => useAudioPreview());
    const hookB = renderHook(() => useAudioPreview());

    act(() => hookA.result.current.toggle("https://example.com/track1.mp3"));
    mockAudioInstance.paused = false;

    act(() => hookB.result.current.toggle("https://example.com/track2.mp3"));

    expect(mockAudioInstance.src).toBe("https://example.com/track2.mp3");
    expect(
      hookA.result.current.isTrackPlaying("https://example.com/track1.mp3")
    ).toBe(false);
    expect(
      hookB.result.current.isTrackPlaying("https://example.com/track2.mp3")
    ).toBe(true);
  });

  it("stop is a no-op when another instance owns playback", async () => {
    const useAudioPreview = await loadHook();
    const hookA = renderHook(() => useAudioPreview());
    const hookB = renderHook(() => useAudioPreview());

    act(() => hookA.result.current.toggle("https://example.com/track1.mp3"));
    mockAudioInstance.paused = false;

    act(() => hookB.result.current.stop());

    expect(
      hookA.result.current.isTrackPlaying("https://example.com/track1.mp3")
    ).toBe(true);
    expect(mockAudioInstance.src).toBe("https://example.com/track1.mp3");
  });

  it("does not stop audio on unmount when another instance owns playback", async () => {
    const useAudioPreview = await loadHook();
    const hookA = renderHook(() => useAudioPreview());
    const hookB = renderHook(() => useAudioPreview());

    act(() => hookA.result.current.toggle("https://example.com/track1.mp3"));
    mockPause.mockClear();

    hookB.unmount();

    expect(mockPause).not.toHaveBeenCalled();
    expect(
      hookA.result.current.isTrackPlaying("https://example.com/track1.mp3")
    ).toBe(true);
  });
});
