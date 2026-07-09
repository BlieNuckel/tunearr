import { useCallback } from "react";
import type { CSSProperties } from "react";
import { sectionSlotClasses } from "../layout";
import type { SectionDefinition, SectionId, SectionStatus } from "../types";

interface SectionSlotProps {
  definition: SectionDefinition;
  hidden: boolean;
  onStatusChange: (id: SectionId, status: SectionStatus) => void;
}

export default function SectionSlot({
  definition,
  hidden,
  onStatusChange,
}: SectionSlotProps) {
  const { id, mobileOrder, Component } = definition;

  const handleStatusChange = useCallback(
    (status: SectionStatus) => onStatusChange(id, status),
    [id, onStatusChange]
  );

  return (
    <section
      data-testid={`discover-section-${id}`}
      className={sectionSlotClasses(definition, hidden)}
      style={{ "--order-mobile": mobileOrder } as CSSProperties}
    >
      <Component onStatusChange={handleStatusChange} />
    </section>
  );
}
