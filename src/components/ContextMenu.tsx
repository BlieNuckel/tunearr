import {
  ReactNode,
  useCallback,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import type { VirtualElement } from "@floating-ui/react-dom";
import OptionMenu, { type Option } from "./OptionMenu";
import useHaptics from "../hooks/useHaptics";

interface ContextMenuProps {
  options: Option[];
  title?: string;
  disabled?: boolean;
  longPressMs?: number;
  className?: string;
  children: ReactNode;
}

interface Point {
  x: number;
  y: number;
}

const MOVE_THRESHOLD = 10;

const WRAPPER_STYLE: CSSProperties = {
  WebkitTouchCallout: "none",
  WebkitUserSelect: "none",
  userSelect: "none",
};

function pointToVirtualElement(point: Point): VirtualElement {
  return {
    getBoundingClientRect: () => ({
      x: point.x,
      y: point.y,
      top: point.y,
      left: point.x,
      right: point.x,
      bottom: point.y,
      width: 0,
      height: 0,
      toJSON: () => ({}),
    }),
  };
}

export default function ContextMenu({
  options,
  title,
  disabled = false,
  longPressMs = 450,
  className,
  children,
}: ContextMenuProps) {
  const haptics = useHaptics();
  const [point, setPoint] = useState<Point | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const timerRef = useRef<number | null>(null);
  const startRef = useRef<Point | null>(null);
  const suppressClickRef = useRef(false);

  const reference = useMemo(
    () => (point ? pointToVirtualElement(point) : null),
    [point]
  );

  const openAt = useCallback((x: number, y: number) => {
    setPoint({ x, y });
    setIsOpen(true);
  }, []);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const active = !disabled && options.length > 0;

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!active) return;
    openAt(e.clientX, e.clientY);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!active) return;
    const touch = e.touches[0];
    if (!touch) return;
    startRef.current = { x: touch.clientX, y: touch.clientY };
    clearTimer();
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      if (!startRef.current) return;
      haptics.medium();
      suppressClickRef.current = true;
      openAt(startRef.current.x, startRef.current.y);
    }, longPressMs);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (!touch || !startRef.current) return;
    const dx = Math.abs(touch.clientX - startRef.current.x);
    const dy = Math.abs(touch.clientY - startRef.current.y);
    if (dx > MOVE_THRESHOLD || dy > MOVE_THRESHOLD) clearTimer();
  };

  const handleClickCapture = (e: React.MouseEvent) => {
    if (suppressClickRef.current) {
      e.preventDefault();
      e.stopPropagation();
      suppressClickRef.current = false;
    }
  };

  return (
    <div
      className={className}
      style={WRAPPER_STYLE}
      onContextMenu={handleContextMenu}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={clearTimer}
      onTouchCancel={clearTimer}
      onClickCapture={handleClickCapture}
    >
      {children}
      <OptionMenu
        options={options}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        reference={reference}
        title={title}
        align="left"
      />
    </div>
  );
}
