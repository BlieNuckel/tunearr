import { renderHook, act } from "@testing-library/react";
import { useOnboarding, STEPS } from "../useOnboarding";

const mockNavigate = vi.fn();
const mockTestConnection = vi.fn();
const mockSaveSettings = vi.fn();
const mockFetch = vi.fn();

vi.stubGlobal("fetch", mockFetch);

vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock("@/context/useLidarrContext", () => ({
  useLidarrContext: () => ({
    testConnection: mockTestConnection,
    saveSettings: mockSaveSettings,
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useOnboarding", () => {
  it("starts at step 0 (welcome)", () => {
    const { result } = renderHook(() => useOnboarding());
    expect(result.current.stepIndex).toBe(0);
    expect(result.current.currentStep).toBe("welcome");
  });

  it("navigates forward and backward", async () => {
    const { result } = renderHook(() => useOnboarding());

    await act(async () => result.current.next());
    expect(result.current.stepIndex).toBe(1);
    expect(result.current.currentStep).toBe("lidarrConnection");

    act(() => result.current.back());
    expect(result.current.stepIndex).toBe(0);
    expect(result.current.currentStep).toBe("welcome");
  });

  it("does not go below step 0", () => {
    const { result } = renderHook(() => useOnboarding());
    act(() => result.current.back());
    expect(result.current.stepIndex).toBe(0);
  });

  it("does not go above last step", async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ valid: true }) });
    const { result } = renderHook(() => useOnboarding());
    for (let i = 0; i < STEPS.length + 2; i++) {
      await act(async () => result.current.next());
    }
    expect(result.current.stepIndex).toBe(STEPS.length - 1);
  });

  it("identifies optional steps", async () => {
    const { result } = renderHook(() => useOnboarding());

    await act(async () => result.current.next());
    await act(async () => result.current.next());
    await act(async () => result.current.next());
    expect(result.current.currentStep).toBe("lastfm");
    expect(result.current.isOptional).toBe(true);

    await act(async () => result.current.next());
    expect(result.current.currentStep).toBe("plex");
    expect(result.current.isOptional).toBe(true);

    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ valid: true }) });
    await act(async () => result.current.next());
    expect(result.current.currentStep).toBe("import");
    expect(result.current.isOptional).toBe(true);
  });

  it("updates fields", () => {
    const { result } = renderHook(() => useOnboarding());
    act(() => result.current.updateField("lidarrUrl", "http://test:8686"));
    expect(result.current.fields.lidarrUrl).toBe("http://test:8686");
  });

  it("tests connection and populates defaults from response", async () => {
    mockTestConnection.mockResolvedValue({
      success: true,
      version: "2.0.0",
      qualityProfiles: [{ id: 5, name: "FLAC" }],
      metadataProfiles: [{ id: 3, name: "Standard" }],
      rootFolderPaths: [{ id: 1, path: "/music" }],
    });

    const { result } = renderHook(() => useOnboarding());

    act(() => result.current.updateField("lidarrUrl", "http://test:8686"));
    act(() => result.current.updateField("lidarrApiKey", "key123"));

    await act(async () => {
      await result.current.handleTestConnection();
    });

    expect(result.current.testResult?.success).toBe(true);
    expect(result.current.fields.qualityProfileId).toBe(5);
    expect(result.current.fields.metadataProfileId).toBe(3);
    expect(result.current.fields.rootFolderPath).toBe("/music");
    expect(result.current.testing).toBe(false);
  });

  it("handles test connection failure", async () => {
    mockTestConnection.mockResolvedValue({
      success: false,
      error: "Connection refused",
    });

    const { result } = renderHook(() => useOnboarding());

    await act(async () => {
      await result.current.handleTestConnection();
    });

    expect(result.current.testResult?.success).toBe(false);
    expect(result.current.fields.qualityProfileId).toBe(0);
  });

  it("handles test connection exception", async () => {
    mockTestConnection.mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useOnboarding());

    await act(async () => {
      await result.current.handleTestConnection();
    });

    expect(result.current.error).toBe("Failed to test connection");
    expect(result.current.testing).toBe(false);
  });

  it("saves settings and navigates on finish", async () => {
    mockSaveSettings.mockResolvedValue(undefined);

    const { result } = renderHook(() => useOnboarding());
    act(() => result.current.updateField("lidarrUrl", "http://test:8686"));
    act(() => result.current.updateField("lidarrApiKey", "key123"));

    await act(async () => {
      await result.current.handleFinish();
    });

    expect(mockSaveSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        lidarrUrl: "http://test:8686",
        lidarrApiKey: "key123",
      })
    );
    expect(mockNavigate).toHaveBeenCalledWith("/");
  });

  it("handles save failure", async () => {
    mockSaveSettings.mockRejectedValue(new Error("Save failed"));

    const { result } = renderHook(() => useOnboarding());

    await act(async () => {
      await result.current.handleFinish();
    });

    expect(result.current.error).toBe("Failed to save settings");
    expect(result.current.saving).toBe(false);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("clears error on navigation", async () => {
    const { result } = renderHook(() => useOnboarding());

    await act(async () => result.current.next());
    expect(result.current.error).toBeNull();
  });

  describe("preNext validation", () => {
    async function goToImportStep(result: {
      current: ReturnType<typeof useOnboarding>;
    }) {
      for (let i = 0; i < 5; i++) {
        await act(async () => result.current.next());
      }
      expect(result.current.currentStep).toBe("import");
    }

    it("blocks next on import step when validation fails", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: async () => ({
          error: 'Import path "/bad" does not exist.',
        }),
      });

      const { result } = renderHook(() => useOnboarding());
      await goToImportStep(result);

      act(() => result.current.updateField("importPath", "/bad"));

      await act(async () => result.current.next());

      expect(result.current.currentStep).toBe("import");
      expect(result.current.error).toBe(
        'Import path "/bad" does not exist.'
      );
    });

    it("advances on import step when validation succeeds", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ valid: true }),
      });

      const { result } = renderHook(() => useOnboarding());
      await goToImportStep(result);

      act(() => result.current.updateField("importPath", "/good"));

      await act(async () => result.current.next());

      expect(result.current.currentStep).toBe("complete");
      expect(result.current.error).toBeNull();
    });

    it("skips validation when importPath is empty", async () => {
      const { result } = renderHook(() => useOnboarding());
      await goToImportStep(result);

      await act(async () => result.current.next());

      expect(result.current.currentStep).toBe("complete");
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("skip() always advances without running preNext", async () => {
      const { result } = renderHook(() => useOnboarding());
      await goToImportStep(result);

      act(() => result.current.updateField("importPath", "/some/path"));

      act(() => result.current.skip());

      expect(result.current.currentStep).toBe("complete");
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("sets validating during preNext check", async () => {
      let resolveFetch!: (value: unknown) => void;
      mockFetch.mockReturnValue(
        new Promise((resolve) => {
          resolveFetch = resolve;
        })
      );

      const { result } = renderHook(() => useOnboarding());
      await goToImportStep(result);

      act(() => result.current.updateField("importPath", "/path"));

      let nextPromise: Promise<void>;
      act(() => {
        nextPromise = result.current.next();
      });

      expect(result.current.validating).toBe(true);

      await act(async () => {
        resolveFetch({ ok: true, json: async () => ({ valid: true }) });
        await nextPromise!;
      });

      expect(result.current.validating).toBe(false);
    });
  });
});
