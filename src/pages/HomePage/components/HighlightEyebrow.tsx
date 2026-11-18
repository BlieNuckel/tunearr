import { TONE_DOT } from "../styles";
import type { HighlightTone } from "../types";

interface HighlightEyebrowProps {
  label: string;
  tone: HighlightTone;
  size?: "md" | "sm";
}

export default function HighlightEyebrow({
  label,
  tone,
  size = "md",
}: HighlightEyebrowProps) {
  const sizing =
    size === "md"
      ? "text-[11px] px-2 py-0.5 border-2 border-black bg-white text-black"
      : "text-[10px] text-gray-600 dark:text-gray-400";

  return (
    <span
      className={`inline-flex items-center gap-1.5 self-start rounded font-bold uppercase tracking-wide ${sizing}`}
    >
      <span
        aria-hidden="true"
        className={`w-2 h-2 rounded-full shrink-0 ${TONE_DOT[tone]} ${tone === "live" ? "animate-pulse" : ""}`}
      />
      {label}
    </span>
  );
}
