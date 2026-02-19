import { useContext } from "react";
import { LidarrContext } from "./lidarrContextDef";

export const useLidarrContext = () => {
  const context = useContext(LidarrContext);
  if (!context) {
    throw new Error(
      "useLidarrContext must be used within LidarrContextProvider"
    );
  }
  return context;
};
