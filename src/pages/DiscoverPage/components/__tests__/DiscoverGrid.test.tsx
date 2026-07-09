import { render, screen } from "@testing-library/react";
import { useEffect } from "react";
import DiscoverGrid from "../DiscoverGrid";
import type {
  SectionComponentProps,
  SectionDefinition,
  SectionStatus,
} from "../../types";

function makeStatusSection(status: SectionStatus, label: string) {
  return function StatusSection({ onStatusChange }: SectionComponentProps) {
    useEffect(() => {
      onStatusChange(status);
    }, [onStatusChange]);
    return <div>{label}</div>;
  };
}

function makeDefinition(
  overrides: Partial<SectionDefinition> = {}
): SectionDefinition {
  return {
    id: "spotlight",
    span: { cols: 6, rows: 1 },
    desktopOrder: 1,
    mobileOrder: 1,
    whenEmpty: "hide",
    Component: makeStatusSection("ready", "spotlight content"),
    ...overrides,
  };
}

describe("DiscoverGrid", () => {
  it("renders every section's content", () => {
    render(
      <DiscoverGrid
        definitions={[
          makeDefinition(),
          makeDefinition({
            id: "artists",
            desktopOrder: 2,
            Component: makeStatusSection("ready", "artists content"),
          }),
        ]}
      />
    );

    expect(screen.getByText("spotlight content")).toBeInTheDocument();
    expect(screen.getByText("artists content")).toBeInTheDocument();
  });

  it("orders slots in the DOM by desktopOrder", () => {
    render(
      <DiscoverGrid
        definitions={[
          makeDefinition({
            id: "artists",
            desktopOrder: 2,
            Component: makeStatusSection("ready", "artists content"),
          }),
          makeDefinition({ id: "spotlight", desktopOrder: 1 }),
        ]}
      />
    );

    const slots = screen.getAllByTestId(/discover-section-/);
    expect(slots.map((el) => el.dataset.testid)).toEqual([
      "discover-section-spotlight",
      "discover-section-artists",
    ]);
  });

  it("hides a slot when its section reports empty and whenEmpty is hide", () => {
    render(
      <DiscoverGrid
        definitions={[
          makeDefinition({
            Component: makeStatusSection("empty", "spotlight content"),
          }),
        ]}
      />
    );

    expect(screen.getByTestId("discover-section-spotlight")).toHaveClass(
      "hidden"
    );
  });

  it("hides a slot when its section reports error and whenEmpty is hide", () => {
    render(
      <DiscoverGrid
        definitions={[
          makeDefinition({
            Component: makeStatusSection("error", "spotlight content"),
          }),
        ]}
      />
    );

    expect(screen.getByTestId("discover-section-spotlight")).toHaveClass(
      "hidden"
    );
  });

  it("keeps an empty section visible when whenEmpty is keep", () => {
    render(
      <DiscoverGrid
        definitions={[
          makeDefinition({
            whenEmpty: "keep",
            Component: makeStatusSection("empty", "spotlight content"),
          }),
        ]}
      />
    );

    expect(screen.getByTestId("discover-section-spotlight")).not.toHaveClass(
      "hidden"
    );
  });

  it("keeps hidden sections mounted so their hooks stay alive", () => {
    render(
      <DiscoverGrid
        definitions={[
          makeDefinition({
            Component: makeStatusSection("empty", "spotlight content"),
          }),
        ]}
      />
    );

    expect(screen.getByText("spotlight content")).toBeInTheDocument();
  });

  it("applies span classes and the mobile order variable to each slot", () => {
    render(
      <DiscoverGrid
        definitions={[
          makeDefinition({ span: { cols: 4, rows: 2 }, mobileOrder: 3 }),
        ]}
      />
    );

    const slot = screen.getByTestId("discover-section-spotlight");
    expect(slot).toHaveClass("lg:col-span-4");
    expect(slot).toHaveClass("lg:row-span-2");
    expect(slot.style.getPropertyValue("--order-mobile")).toBe("3");
  });
});
