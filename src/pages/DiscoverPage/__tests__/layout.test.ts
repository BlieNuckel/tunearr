import { resolveLayout, sectionSlotClasses } from "../layout";
import type { SectionDefinition } from "../types";

function makeDefinition(
  overrides: Partial<SectionDefinition> = {}
): SectionDefinition {
  return {
    id: "newReleases",
    span: { cols: 6, rows: 1 },
    desktopOrder: 1,
    mobileOrder: 1,
    whenEmpty: "hide",
    Component: () => null,
    ...overrides,
  };
}

describe("resolveLayout", () => {
  it("sorts sections by desktopOrder", () => {
    const first = makeDefinition({ id: "liveBanner", desktopOrder: 2 });
    const second = makeDefinition({ id: "newReleases", desktopOrder: 1 });

    const resolved = resolveLayout([first, second], {});

    expect(resolved.map((r) => r.definition.id)).toEqual([
      "newReleases",
      "liveBanner",
    ]);
  });

  it("treats unreported sections as loading and keeps them visible", () => {
    const resolved = resolveLayout([makeDefinition()], {});
    expect(resolved[0].hidden).toBe(false);
  });

  it("hides an empty section when whenEmpty is hide", () => {
    const resolved = resolveLayout([makeDefinition()], {
      newReleases: "empty",
    });
    expect(resolved[0].hidden).toBe(true);
  });

  it("hides an errored section when whenEmpty is hide", () => {
    const resolved = resolveLayout([makeDefinition()], {
      newReleases: "error",
    });
    expect(resolved[0].hidden).toBe(true);
  });

  it("keeps an errored section visible when whenError is keep", () => {
    const resolved = resolveLayout([makeDefinition({ whenError: "keep" })], {
      newReleases: "error",
    });
    expect(resolved[0].hidden).toBe(false);
  });

  it("still hides an empty section when only errors are kept", () => {
    const resolved = resolveLayout([makeDefinition({ whenError: "keep" })], {
      newReleases: "empty",
    });
    expect(resolved[0].hidden).toBe(true);
  });

  it("hides an errored section when whenError overrides a kept whenEmpty", () => {
    const resolved = resolveLayout(
      [makeDefinition({ whenEmpty: "keep", whenError: "hide" })],
      { newReleases: "error" }
    );
    expect(resolved[0].hidden).toBe(true);
  });

  it("keeps an empty section visible when whenEmpty is keep", () => {
    const resolved = resolveLayout([makeDefinition({ whenEmpty: "keep" })], {
      newReleases: "empty",
    });
    expect(resolved[0].hidden).toBe(false);
  });

  it("keeps ready sections visible", () => {
    const resolved = resolveLayout([makeDefinition()], {
      newReleases: "ready",
    });
    expect(resolved[0].hidden).toBe(false);
  });

  it("does not mutate the definitions array", () => {
    const definitions = [
      makeDefinition({ id: "liveBanner", desktopOrder: 2 }),
      makeDefinition({ id: "newReleases", desktopOrder: 1 }),
    ];

    resolveLayout(definitions, {});

    expect(definitions[0].id).toBe("liveBanner");
  });
});

describe("sectionSlotClasses", () => {
  it("returns only the hidden class for hidden sections", () => {
    expect(sectionSlotClasses(makeDefinition(), true)).toBe("hidden");
  });

  it("maps column and row spans to grid classes", () => {
    const classes = sectionSlotClasses(
      makeDefinition({ span: { cols: 4, rows: 2 } }),
      false
    );

    expect(classes).toContain("lg:col-span-4");
    expect(classes).toContain("lg:row-span-2");
  });

  it("maps every row span the registry can use", () => {
    for (const rows of [1, 2, 3, 4, 5, 6] as const) {
      expect(
        sectionSlotClasses(makeDefinition({ span: { cols: 4, rows } }), false)
      ).toContain(`lg:row-span-${rows}`);
    }
  });

  it("includes the mobile order class", () => {
    const classes = sectionSlotClasses(makeDefinition(), false);
    expect(classes).toContain("max-lg:[order:var(--order-mobile)]");
  });

  it("bounds the slot at desktop sizes so a tall tile cannot spill over its neighbour", () => {
    const classes = sectionSlotClasses(makeDefinition(), false);

    expect(classes).toContain("lg:min-h-0");
    expect(classes).toContain("lg:overflow-hidden");
  });

  it("insets the slot on the shadowed sides so the widget's drop shadow is not clipped", () => {
    const classes = sectionSlotClasses(makeDefinition(), false);

    expect(classes).toContain("lg:pr-[var(--bento-shadow-reach)]");
    expect(classes).toContain("lg:pb-[var(--bento-shadow-reach)]");
  });

  it("leaves mobile unbounded, where tiles stack and size to their content", () => {
    const classes = sectionSlotClasses(makeDefinition(), false);

    expect(classes).not.toContain(" overflow-hidden");
    expect(classes.startsWith("overflow-hidden")).toBe(false);
  });
});
