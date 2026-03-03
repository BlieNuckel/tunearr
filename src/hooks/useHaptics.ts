import { useWebHaptics } from "web-haptics/react";

export function useHaptics() {
  const { trigger, isSupported } = useWebHaptics();
  return { haptic: trigger, isSupported };
}
