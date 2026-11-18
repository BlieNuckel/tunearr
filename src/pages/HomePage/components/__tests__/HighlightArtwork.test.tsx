import { fireEvent, render, screen } from "@testing-library/react";
import HighlightArtwork from "../HighlightArtwork";
import { describeHighlight } from "../../highlightView";
import { liveHighlight, releaseHighlight } from "../../__tests__/fixtures";

describe("HighlightArtwork", () => {
  it("shows the cover", () => {
    render(<HighlightArtwork view={describeHighlight(releaseHighlight())} />);

    expect(
      screen.getByAltText("Heaven to a Tortured Mind cover art")
    ).toHaveAttribute("src", "https://caa.test/rg-1.jpg");
  });

  it("frames a cover over a blurred copy that screen readers skip", () => {
    const { container } = render(
      <HighlightArtwork view={describeHighlight(releaseHighlight())} framed />
    );

    const images = container.querySelectorAll("img");
    expect(images).toHaveLength(2);
    expect(images[0]).toHaveAttribute("aria-hidden", "true");
    expect(screen.getAllByRole("img")).toHaveLength(1);
  });

  it("does not frame an event photo", () => {
    const { container } = render(
      <HighlightArtwork view={describeHighlight(liveHighlight())} framed />
    );
    expect(container.querySelectorAll("img")).toHaveLength(1);
  });

  it("falls back to an icon when the image fails", () => {
    render(<HighlightArtwork view={describeHighlight(releaseHighlight())} />);

    fireEvent.error(screen.getByAltText("Heaven to a Tortured Mind cover art"));

    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
});
