import { renderHook } from "@testing-library/react";
import { useSettings } from "../useSettings";

describe("useSettings", () => {
  it("throws when used outside SettingsContextProvider", () => {
    expect(() => {
      renderHook(() => useSettings());
    }).toThrow("useSettings must be used within SettingsContextProvider");
  });
});
