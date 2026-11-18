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

  it("crops an event photo to fill its box", () => {
    render(<HighlightArtwork view={describeHighlight(liveHighlight())} />);

    expect(screen.getByAltText("Yves Tumor at Amiralen")).toHaveClass(
      "object-cover"
    );
  });

  it("falls back to an icon when the image fails", () => {
    render(<HighlightArtwork view={describeHighlight(releaseHighlight())} />);

    fireEvent.error(screen.getByAltText("Heaven to a Tortured Mind cover art"));

    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
});
