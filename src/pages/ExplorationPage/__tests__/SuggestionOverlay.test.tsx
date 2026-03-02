import { render, screen, fireEvent } from "@testing-library/react";
import SuggestionOverlay from "../components/SuggestionOverlay";
import type { ReleaseGroup } from "@/types";

vi.mock("@/components/ReleaseGroupCard", () => ({
  default: ({ releaseGroup }: { releaseGroup: { title: string } }) => (
    <div data-testid="release-group-card">{releaseGroup.title}</div>
  ),
}));

const releaseGroup: ReleaseGroup = {
  id: "rg-1",
  score: 100,
  title: "Test Album",
  "primary-type": "Album",
  "first-release-date": "2020-01-01",
  "artist-credit": [
    { name: "Test Artist", artist: { id: "art-1", name: "Test Artist" } },
  ],
};

describe("SuggestionOverlay", () => {
  it("renders tag chips and ReleaseGroupCard", () => {
    render(
      <SuggestionOverlay
        releaseGroup={releaseGroup}
        tags={["rock", "indie"]}
        onPick={vi.fn()}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByText("rock")).toBeInTheDocument();
    expect(screen.getByText("indie")).toBeInTheDocument();
    expect(screen.getByTestId("release-group-card")).toBeInTheDocument();
    expect(screen.getByText("Test Album")).toBeInTheDocument();
  });

  it("renders single tag chip", () => {
    render(
      <SuggestionOverlay
        releaseGroup={releaseGroup}
        tags={["rock"]}
        onPick={vi.fn()}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByText("rock")).toBeInTheDocument();
  });

  it("calls onPick when Pick this button clicked", () => {
    const onPick = vi.fn();
    render(
      <SuggestionOverlay
        releaseGroup={releaseGroup}
        tags={["rock"]}
        onPick={onPick}
        onClose={vi.fn()}
      />
    );
    fireEvent.click(screen.getByText("Pick this"));
    expect(onPick).toHaveBeenCalledOnce();
  });

  it("calls onClose when close button clicked", () => {
    const onClose = vi.fn();
    render(
      <SuggestionOverlay
        releaseGroup={releaseGroup}
        tags={["rock"]}
        onPick={vi.fn()}
        onClose={onClose}
      />
    );
    fireEvent.click(screen.getByText("✕"));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("calls onClose when backdrop clicked", () => {
    const onClose = vi.fn();
    const { container } = render(
      <SuggestionOverlay
        releaseGroup={releaseGroup}
        tags={["rock"]}
        onPick={vi.fn()}
        onClose={onClose}
      />
    );
    fireEvent.click(container.firstChild as Element);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("does not call onClose when content area clicked", () => {
    const onClose = vi.fn();
    render(
      <SuggestionOverlay
        releaseGroup={releaseGroup}
        tags={["rock"]}
        onPick={vi.fn()}
        onClose={onClose}
      />
    );
    fireEvent.click(screen.getByTestId("release-group-card"));
    expect(onClose).not.toHaveBeenCalled();
  });
});
