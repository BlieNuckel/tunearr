import { useContext } from "react";
import { SettingsContext } from "./settingsContextDef";

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within SettingsContextProvider");
  }
  return context;
};
