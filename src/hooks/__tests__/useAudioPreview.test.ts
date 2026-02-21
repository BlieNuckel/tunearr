import { renderHook, act } from "@testing-library/react";
import useAudioPreview from "../useAudioPreview";

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
});

describe("useAudioPreview", () => {
  it("plays a track when toggle is called", () => {
    const { result } = renderHook(() => useAudioPreview());

    act(() => result.current.toggle("https://example.com/preview.mp3"));

    expect(mockAudioInstance.src).toBe("https://example.com/preview.mp3");
    expect(mockPlay).toHaveBeenCalled();
    expect(result.current.isTrackPlaying("https://example.com/preview.mp3")).toBe(true);
  });

  it("pauses when toggling the same track that is playing", () => {
    const { result } = renderHook(() => useAudioPreview());

    act(() => result.current.toggle("https://example.com/preview.mp3"));
    mockAudioInstance.paused = false;

    act(() => result.current.toggle("https://example.com/preview.mp3"));

    expect(mockPause).toHaveBeenCalled();
    expect(result.current.isTrackPlaying("https://example.com/preview.mp3")).toBe(false);
  });

  it("switches to a different track", () => {
    const { result } = renderHook(() => useAudioPreview());

    act(() => result.current.toggle("https://example.com/track1.mp3"));
    mockAudioInstance.paused = false;

    act(() => result.current.toggle("https://example.com/track2.mp3"));

    expect(mockAudioInstance.src).toBe("https://example.com/track2.mp3");
    expect(mockPlay).toHaveBeenCalledTimes(2);
    expect(result.current.isTrackPlaying("https://example.com/track2.mp3")).toBe(true);
    expect(result.current.isTrackPlaying("https://example.com/track1.mp3")).toBe(false);
  });

  it("stops playback", () => {
    const { result } = renderHook(() => useAudioPreview());

    act(() => result.current.toggle("https://example.com/preview.mp3"));

    act(() => result.current.stop());

    expect(mockPause).toHaveBeenCalled();
    expect(mockAudioInstance.src).toBe("");
    expect(result.current.isTrackPlaying("https://example.com/preview.mp3")).toBe(false);
  });

  it("resets state when track ends", () => {
    const { result } = renderHook(() => useAudioPreview());

    act(() => result.current.toggle("https://example.com/preview.mp3"));
    expect(result.current.isTrackPlaying("https://example.com/preview.mp3")).toBe(true);

    act(() => endedHandler!());

    expect(result.current.isTrackPlaying("https://example.com/preview.mp3")).toBe(false);
  });

  it("cleans up audio element on unmount", () => {
    const { unmount } = renderHook(() => useAudioPreview());

    unmount();

    expect(mockAudioInstance.removeEventListener).toHaveBeenCalledWith(
      "ended",
      expect.any(Function)
    );
    expect(mockPause).toHaveBeenCalled();
    expect(mockAudioInstance.src).toBe("");
  });
});
