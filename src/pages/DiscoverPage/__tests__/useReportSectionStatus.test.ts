import { renderHook } from "@testing-library/react";
import useReportSectionStatus, {
  deriveSectionStatus,
} from "../useReportSectionStatus";
import type { SectionDataState } from "../useReportSectionStatus";

describe("deriveSectionStatus", () => {
  it("returns loading while loading, even if empty", () => {
    expect(
      deriveSectionStatus({ loading: true, error: false, empty: true })
    ).toBe("loading");
  });

  it("returns error over empty once loading finishes", () => {
    expect(
      deriveSectionStatus({ loading: false, error: true, empty: true })
    ).toBe("error");
  });

  it("returns empty when loaded without data", () => {
    expect(
      deriveSectionStatus({ loading: false, error: false, empty: true })
    ).toBe("empty");
  });

  it("returns ready when loaded with data", () => {
    expect(
      deriveSectionStatus({ loading: false, error: false, empty: false })
    ).toBe("ready");
  });
});

describe("useReportSectionStatus", () => {
  it("reports the derived status on mount", () => {
    const onStatusChange = vi.fn();

    renderHook(() =>
      useReportSectionStatus(onStatusChange, {
        loading: true,
        error: false,
        empty: true,
      })
    );

    expect(onStatusChange).toHaveBeenCalledTimes(1);
    expect(onStatusChange).toHaveBeenCalledWith("loading");
  });

  it("reports again when the derived status changes", () => {
    const onStatusChange = vi.fn();

    const { rerender } = renderHook(
      (state: SectionDataState) =>
        useReportSectionStatus(onStatusChange, state),
      { initialProps: { loading: true, error: false, empty: true } }
    );
    rerender({ loading: false, error: false, empty: false });

    expect(onStatusChange).toHaveBeenNthCalledWith(1, "loading");
    expect(onStatusChange).toHaveBeenNthCalledWith(2, "ready");
  });

  it("does not re-report when flags change but the status does not", () => {
    const onStatusChange = vi.fn();

    const { rerender } = renderHook(
      (state: SectionDataState) =>
        useReportSectionStatus(onStatusChange, state),
      { initialProps: { loading: false, error: false, empty: false } }
    );
    rerender({ loading: false, error: false, empty: false });

    expect(onStatusChange).toHaveBeenCalledTimes(1);
  });
});
