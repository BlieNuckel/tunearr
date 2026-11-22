import type { ReactNode } from "react";

interface ModalHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  /** Anything else that belongs to the header, under the subtitle. */
  children?: ReactNode;
  className?: string;
}

export default function ModalHeader({
  title,
  subtitle,
  children,
  className,
}: ModalHeaderProps) {
  return (
    <div className={className}>
      <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {subtitle}
        </p>
      )}
      {children}
    </div>
  );
}
