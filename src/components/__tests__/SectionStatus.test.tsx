import { render, screen, fireEvent } from "@testing-library/react";
import SectionStatus from "../SectionStatus";

describe("SectionStatus", () => {
  it("renders nothing without an error or a retry", () => {
    const { container } = render(
      <SectionStatus
        subject="this album"
        error={null}
        errorKind={null}
        retrying={false}
      />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("says MusicBrainz is busy while retrying", () => {
    render(
      <SectionStatus
        subject="this album"
        error="MusicBrainz is busy"
        errorKind="busy"
        retrying
        onRetry={vi.fn()}
      />
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "MusicBrainz is busy, retrying…"
    );
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("offers a manual retry once automatic retries run out", () => {
    const onRetry = vi.fn();
    render(
      <SectionStatus
        subject="the tracklist"
        error="MusicBrainz is busy"
        errorKind="busy"
        retrying={false}
        onRetry={onRetry}
      />
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "MusicBrainz is still busy, so we couldn't load the tracklist."
    );
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalled();
  });

  it("does not offer a retry for something that doesn't exist", () => {
    render(
      <SectionStatus
        subject="this album"
        error="Album not found"
        errorKind="notFound"
        retrying={false}
        onRetry={vi.fn()}
      />
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "MusicBrainz has no record of this album."
    );
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("uses plain copy for other failures", () => {
    render(
      <SectionStatus
        subject="similar albums"
        error="boom"
        errorKind="other"
        retrying={false}
        onRetry={vi.fn()}
      />
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "We couldn't load similar albums."
    );
    expect(screen.getByRole("button", { name: "Try again" })).toBeVisible();
  });
});
