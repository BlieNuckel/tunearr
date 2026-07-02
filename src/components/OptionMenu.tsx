import { RefObject, useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  useFloating,
  offset,
  flip,
  shift,
  autoUpdate,
  type ReferenceType,
} from "@floating-ui/react-dom";
import BottomSheet from "./BottomSheet";
import useHaptics from "../hooks/useHaptics";

interface Option {
  label: string;
  onClick: () => void;
}

interface OptionMenuProps {
  options: Option[];
  isOpen: boolean;
  onClose: () => void;
  reference: ReferenceType | null;
  title?: string;
  align?: "left" | "right";
  ignoreRefs?: RefObject<HTMLElement | null>[];
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(
    () => !window.matchMedia("(min-width: 640px)").matches
  );

  useEffect(() => {
    const mql = window.matchMedia("(min-width: 640px)");
    const handler = (e: MediaQueryListEvent) => setIsMobile(!e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  return isMobile;
}

function useClickOutside(
  refs: RefObject<HTMLElement | null>[],
  isOpen: boolean,
  onClose: () => void
) {
  const stableOnClose = useCallback(() => onClose(), [onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const listener = (e: MouseEvent) => {
      const target = e.target as Node;
      if (refs.some((ref) => ref.current?.contains(target))) return;
      stableOnClose();
    };
    document.addEventListener("mousedown", listener);
    return () => document.removeEventListener("mousedown", listener);
  }, [isOpen, refs, stableOnClose]);
}

function OptionList({
  options,
  onClose,
}: {
  options: Option[];
  onClose: () => void;
}) {
  const haptics = useHaptics();

  return (
    <div className="flex flex-col gap-1">
      {options.map((option) => (
        <button
          key={option.label}
          type="button"
          onClick={() => {
            haptics.light();
            option.onClick();
            onClose();
          }}
          className="w-full text-left px-3 py-2 text-sm text-gray-900 dark:text-gray-100 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export default function OptionMenu({
  options,
  isOpen,
  onClose,
  reference,
  title,
  align = "right",
  ignoreRefs,
}: OptionMenuProps) {
  const isMobile = useIsMobile();
  const floatingRef = useRef<HTMLDivElement | null>(null);
  const [floatingEl, setFloatingEl] = useState<HTMLElement | null>(null);

  const setFloating = useCallback((node: HTMLDivElement | null) => {
    floatingRef.current = node;
    setFloatingEl(node);
  }, []);

  const { floatingStyles, placement } = useFloating({
    elements: { reference, floating: floatingEl },
    placement: align === "right" ? "bottom-end" : "bottom-start",
    strategy: "fixed",
    transform: false,
    middleware: [offset(6), flip(), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
  });

  useClickOutside(
    [...(ignoreRefs ?? []), floatingRef],
    isOpen && !isMobile,
    onClose
  );

  if (isMobile) {
    return (
      <BottomSheet isOpen={isOpen} onClose={onClose} title={title}>
        <OptionList options={options} onClose={onClose} />
      </BottomSheet>
    );
  }

  if (!isOpen) return null;

  const originClass = placement.startsWith("top")
    ? "origin-bottom"
    : "origin-top";

  return createPortal(
    <div
      ref={setFloating}
      style={floatingStyles}
      className={`min-w-48 bg-white dark:bg-gray-800 border-2 border-black rounded-xl shadow-cartoon-lg py-1 z-50 animate-dropdown-in ${originClass}`}
    >
      <OptionList options={options} onClose={onClose} />
    </div>,
    document.body
  );
}

export type { Option };
