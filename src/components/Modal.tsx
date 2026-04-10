import { ReactNode, useState } from "react";
import { createPortal } from "react-dom";
import useIsMobile from "@/hooks/useIsMobile";
import BottomSheet from "./BottomSheet";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  panelClassName?: string;
}

export default function Modal({
  isOpen,
  onClose,
  children,
  panelClassName,
}: ModalProps) {
  const isMobile = useIsMobile();
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  const [closing, setClosing] = useState(false);

  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    setClosing(isMobile ? false : !isOpen);
  }

  if (isMobile) {
    return (
      <BottomSheet isOpen={isOpen} onClose={onClose}>
        {children}
      </BottomSheet>
    );
  }

  if (!isOpen && !closing) return null;

  return createPortal(
    <div
      data-testid="modal-backdrop"
      className={`fixed inset-0 flex items-center justify-center z-50 p-4 bg-black/60 dark:bg-black/80 ${closing ? "animate-backdrop-out" : "animate-backdrop-in"}`}
      onClick={onClose}
    >
      <div
        className={`bg-white dark:bg-gray-800 p-6 flex flex-col ${panelClassName ?? "max-w-md"} rounded-xl border-4 border-black shadow-cartoon-lg ${closing ? "animate-pop-out" : "animate-pop"}`}
        onAnimationEnd={() => {
          if (closing) setClosing(false);
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}
