import { ReactNode, useState } from "react";
import { createPortal } from "react-dom";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
}

export default function Modal({ isOpen, onClose, children }: ModalProps) {
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  const [closing, setClosing] = useState(false);

  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    setClosing(!isOpen);
  }

  if (!isOpen && !closing) return null;

  return createPortal(
    <div
      data-testid="modal-backdrop"
      className="fixed inset-0 flex items-center justify-center z-50 md:p-4 bg-black/60 dark:bg-black/80"
      onClick={onClose}
    >
      <div
        className={`bg-white dark:bg-gray-800 w-full h-full p-6 md:h-auto md:max-w-md md:rounded-xl md:border-4 md:border-black md:shadow-cartoon-lg ${closing ? "animate-pop-out" : "animate-pop"}`}
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
