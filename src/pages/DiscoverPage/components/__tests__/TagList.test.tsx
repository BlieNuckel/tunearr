import { render, screen, fireEvent } from "@testing-library/react";
import TagList from "../TagList";

const defaultProps = {
  tags: [{ name: "rock" }, { name: "alternative" }],
  activeTags: [] as string[],
  showingTagResults: false,
  selectedArtist: "Radiohead",
  onTagClick: vi.fn(),
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
      <TagList
        {...defaultProps}
        activeTags={["rock"]}
        showingTagResults={true}
      />
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
    render(<TagList {...defaultProps} activeTags={["rock"]} />);
    const rockButton = screen.getByText("rock").closest("button")!;
    expect(rockButton.className).toContain("bg-amber-300");
  });

  it("renders nothing when tags is empty", () => {
    render(<TagList {...defaultProps} tags={[]} />);
    expect(screen.queryByText("rock")).not.toBeInTheDocument();
  });

  it("highlights multiple active tags", () => {
    render(<TagList {...defaultProps} activeTags={["rock", "alternative"]} />);
    const rockButton = screen.getByText("rock").closest("button")!;
    const altButton = screen.getByText("alternative").closest("button")!;
    expect(rockButton.className).toContain("bg-amber-300");
    expect(altButton.className).toContain("bg-amber-300");
  });

  it("shows comma-separated tags in heading for multiple tags", () => {
    render(
      <TagList
        {...defaultProps}
        activeTags={["rock", "alternative"]}
        showingTagResults={true}
      />
    );
    expect(
      screen.getByText('Top artists for "rock", "alternative"')
    ).toBeInTheDocument();
  });
});
