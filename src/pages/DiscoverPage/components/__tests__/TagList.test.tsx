import { render, screen, fireEvent } from "@testing-library/react";
import TagList from "../TagList";

const defaultProps = {
  tags: [{ name: "rock" }, { name: "alternative" }],
  activeTag: null,
  showingTagResults: false,
  selectedArtist: "Radiohead",
  onTagClick: vi.fn(),
  onClearTag: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("TagList", () => {
  it("shows similar heading when not showing tag results", () => {
    render(<TagList {...defaultProps} />);
    expect(screen.getByText('Similar to "Radiohead"')).toBeInTheDocument();
  });

  it("shows tag results heading when active tag", () => {
    render(
      <TagList {...defaultProps} activeTag="rock" showingTagResults={true} />
    );
    expect(screen.getByText('Top artists for "rock"')).toBeInTheDocument();
  });

  it("renders tag buttons", () => {
    render(<TagList {...defaultProps} />);
    expect(screen.getByText("rock")).toBeInTheDocument();
    expect(screen.getByText("alternative")).toBeInTheDocument();
  });

  it("calls onTagClick when tag clicked", () => {
    render(<TagList {...defaultProps} />);
    fireEvent.click(screen.getByText("rock"));
    expect(defaultProps.onTagClick).toHaveBeenCalledWith("rock");
  });

  it("highlights active tag", () => {
    render(<TagList {...defaultProps} activeTag="rock" />);
    const rockButton = screen.getByText("rock").closest("button")!;
    expect(rockButton.className).toContain("bg-amber-300");
  });

  it("shows back button when tag is active", () => {
    render(<TagList {...defaultProps} activeTag="rock" />);
    expect(screen.getByText("Back to similar")).toBeInTheDocument();
  });

  it("does not show back button when no active tag", () => {
    render(<TagList {...defaultProps} />);
    expect(screen.queryByText("Back to similar")).not.toBeInTheDocument();
  });

  it("calls onClearTag when back button clicked", () => {
    render(<TagList {...defaultProps} activeTag="rock" />);
    fireEvent.click(screen.getByText("Back to similar"));
    expect(defaultProps.onClearTag).toHaveBeenCalled();
  });

  it("renders nothing when tags is empty", () => {
    render(<TagList {...defaultProps} tags={[]} />);
    expect(screen.queryByText("rock")).not.toBeInTheDocument();
  });
});
