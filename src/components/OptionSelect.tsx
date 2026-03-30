import { RefObject, useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { EllipsisVerticalIcon } from "@/components/icons";
import BottomSheet from "./BottomSheet";

interface Option {
  label: string;
  onClick: () => void;
}

interface OptionSelectProps {
  options: Option[];
  title?: string;
  align?: "left" | "right";
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

function useAnchorPosition(
  anchorRef: RefObject<HTMLElement | null>,
  isOpen: boolean,
  align: "left" | "right"
) {
  const [style, setStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    if (!isOpen || !anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    setStyle({
      position: "fixed",
      top: rect.bottom + 6,
      ...(align === "right"
        ? { right: window.innerWidth - rect.right }
        : { left: rect.left }),
    });
  }, [isOpen, align, anchorRef]);

  return style;
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
  return (
    <div className="flex flex-col gap-1">
      {options.map((option) => (
        <button
          key={option.label}
          type="button"
          onClick={() => {
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

function Popup({
  anchorRef,
  dropdownRef,
  isOpen,
  onClose,
  options,
  title,
  align,
}: {
  anchorRef: RefObject<HTMLElement | null>;
  dropdownRef: RefObject<HTMLDivElement | null>;
  isOpen: boolean;
  onClose: () => void;
  options: Option[];
  title?: string;
  align: "left" | "right";
}) {
  const isMobile = useIsMobile();
  const style = useAnchorPosition(anchorRef, isOpen && !isMobile, align);
  useClickOutside([anchorRef, dropdownRef], isOpen && !isMobile, onClose);

  if (isMobile) {
    return (
      <BottomSheet isOpen={isOpen} onClose={onClose} title={title}>
        <OptionList options={options} onClose={onClose} />
      </BottomSheet>
    );
  }

  if (!isOpen) return null;

  return createPortal(
    <div
      ref={dropdownRef}
      style={style}
      className="min-w-48 bg-white dark:bg-gray-800 border-2 border-black rounded-xl shadow-cartoon-lg py-1 z-50 animate-dropdown-in"
    >
      <OptionList options={options} onClose={onClose} />
    </div>,
    document.body
  );
}

export default function OptionSelect({
  options,
  title,
  align = "right",
}: OptionSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setIsOpen(false), []);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        aria-label="More options"
      >
        <EllipsisVerticalIcon className="w-5 h-5" />
      </button>
      <Popup
        anchorRef={triggerRef}
        dropdownRef={dropdownRef}
        isOpen={isOpen}
        onClose={close}
        options={options}
        title={title}
        align={align}
      />
    </>
  );
}

export type { Option, OptionSelectProps };
