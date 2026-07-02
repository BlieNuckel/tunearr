import { useCallback, useRef, useState } from "react";
import { EllipsisVerticalIcon } from "@/components/icons";
import useHaptics from "../hooks/useHaptics";
import OptionMenu, { type Option } from "./OptionMenu";

interface OptionSelectProps {
  options: Option[];
  title?: string;
  align?: "left" | "right";
}

export default function OptionSelect({
  options,
  title,
  align = "right",
}: OptionSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [triggerEl, setTriggerEl] = useState<HTMLElement | null>(null);
  const close = useCallback(() => setIsOpen(false), []);

  const setTrigger = useCallback((node: HTMLButtonElement | null) => {
    triggerRef.current = node;
    setTriggerEl(node);
  }, []);

  const haptics = useHaptics();

  return (
    <>
      <button
        ref={setTrigger}
        type="button"
        onClick={() => {
          haptics.light();
          setIsOpen((prev) => !prev);
        }}
        className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        aria-label="More options"
      >
        <EllipsisVerticalIcon className="w-5 h-5" />
      </button>
      <OptionMenu
        options={options}
        isOpen={isOpen}
        onClose={close}
        reference={triggerEl}
        title={title}
        align={align}
        ignoreRefs={[triggerRef]}
      />
    </>
  );
}

export type { Option, OptionSelectProps };
