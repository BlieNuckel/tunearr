import { ReactNode } from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
}

export default function Modal({ isOpen, onClose, children }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div
      data-testid="modal-backdrop"
      className="fixed inset-0 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl max-w-md w-full p-6 border-4 border-black shadow-cartoon-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
