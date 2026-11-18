import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import HighlightsCarousel from "../HighlightsCarousel";
import type { Highlight } from "@/types";
import {
  handlers,
  liveHighlight,
  releaseHighlight,
} from "../../__tests__/fixtures";

const RELEASE = releaseHighlight();
const LIVE = liveHighlight();

function renderCarousel(highlights: Highlight[]) {
  return render(
    <MemoryRouter>
      <HighlightsCarousel highlights={highlights} handlers={handlers()} />
    </MemoryRouter>
  );
}

describe("HighlightsCarousel", () => {
  it("puts every highlight on its own slide", () => {
    renderCarousel([RELEASE, LIVE]);

    expect(screen.getByRole("group", { name: "Highlights" })).toHaveAttribute(
      "aria-roledescription",
      "carousel"
    );
    expect(screen.getByRole("group", { name: "1 of 2" })).toHaveTextContent(
      "Heaven to a Tortured Mind"
    );
    expect(screen.getByRole("group", { name: "2 of 2" })).toHaveTextContent(
      "Yves Tumor"
    );
  });

  it("marks the first slide as current", () => {
    renderCarousel([RELEASE, LIVE]);

    expect(
      screen.getByRole("button", { name: "Show highlight 1" })
    ).toHaveAttribute("aria-current", "true");
    expect(
      screen.getByRole("button", { name: "Show highlight 2" })
    ).not.toHaveAttribute("aria-current");
  });

  it("scrolls to a slide when its dot is chosen", async () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    renderCarousel([RELEASE, LIVE]);

    await userEvent.click(
      screen.getByRole("button", { name: "Show highlight 2" })
    );

    expect(scrollIntoView).toHaveBeenCalledWith({
      behavior: "smooth",
      block: "nearest",
      inline: "start",
    });
    expect(
      screen.getByRole("button", { name: "Show highlight 2" })
    ).toHaveAttribute("aria-current", "true");
    delete (Element.prototype as Partial<Element>).scrollIntoView;
  });

  it("follows the slide scrolled into view", () => {
    renderCarousel([RELEASE, LIVE]);
    const track = screen.getByRole("group", { name: "1 of 2" })
      .parentElement as HTMLElement;
    const [first, second] = Array.from(track.children) as HTMLElement[];
    Object.defineProperty(first, "offsetWidth", { value: 300 });
    Object.defineProperty(first, "offsetLeft", { value: 0 });
    Object.defineProperty(second, "offsetLeft", { value: 312 });
    Object.defineProperty(track, "scrollWidth", { value: 1000 });
    Object.defineProperty(track, "clientWidth", { value: 350 });

    track.scrollLeft = 300;
    fireEvent.scroll(track);

    expect(
      screen.getByRole("button", { name: "Show highlight 2" })
    ).toHaveAttribute("aria-current", "true");
  });

  it("leaves out the dots for a single highlight", () => {
    renderCarousel([RELEASE]);

    expect(
      screen.queryByRole("button", { name: "Show highlight 1" })
    ).not.toBeInTheDocument();
    expect(screen.getByRole("group", { name: "1 of 1" })).toHaveClass("w-full");
  });
});
