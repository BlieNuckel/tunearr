import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import HighlightsSpotlight from "../HighlightsSpotlight";
import type { Highlight } from "@/types";
import {
  handlers,
  liveHighlight,
  releaseHighlight,
} from "../../__tests__/fixtures";

const RELEASE = releaseHighlight();
const LIVE = liveHighlight();
const EP = releaseHighlight({
  key: "release:2",
  followedReleaseId: 2,
  title: "Second Record",
  releaseType: "EP",
});

function renderSpotlight(highlights: Highlight[]) {
  return render(
    <MemoryRouter>
      <HighlightsSpotlight highlights={highlights} handlers={handlers()} />
    </MemoryRouter>
  );
}

function featuredTitle(): string | null {
  return within(screen.getByRole("article")).getByRole("heading").textContent;
}

describe("HighlightsSpotlight", () => {
  it("features the first highlight and lists the rest beside it", () => {
    renderSpotlight([RELEASE, LIVE, EP]);

    expect(featuredTitle()).toBe("Heaven to a Tortured Mind");
    const waiting = within(
      screen.getByRole("list", { name: "More highlights" })
    ).getAllByRole("button");
    expect(waiting.map((b) => b.getAttribute("aria-label"))).toEqual([
      "Show Live near you: Yves Tumor",
      "Show New EP: Second Record",
    ]);
  });

  it("brings a waiting highlight forward when chosen", async () => {
    renderSpotlight([RELEASE, LIVE, EP]);

    await userEvent.click(
      screen.getByRole("button", { name: "Show New EP: Second Record" })
    );

    expect(featuredTitle()).toBe("Second Record");
    expect(
      screen.getByRole("button", {
        name: "Show New album: Heaven to a Tortured Mind",
      })
    ).toBeInTheDocument();
  });

  it("falls back to the first highlight when the featured one goes away", async () => {
    const { rerender } = renderSpotlight([RELEASE, LIVE, EP]);
    await userEvent.click(
      screen.getByRole("button", { name: "Show New EP: Second Record" })
    );

    rerender(
      <MemoryRouter>
        <HighlightsSpotlight
          highlights={[RELEASE, LIVE]}
          handlers={handlers()}
        />
      </MemoryRouter>
    );

    expect(featuredTitle()).toBe("Heaven to a Tortured Mind");
  });

  it("gives a lone highlight the whole width", () => {
    renderSpotlight([RELEASE]);

    expect(
      screen.queryByRole("list", { name: "More highlights" })
    ).not.toBeInTheDocument();
    expect(screen.getByRole("article").parentElement).toHaveClass("col-span-3");
  });
});
