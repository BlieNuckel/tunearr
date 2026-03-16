import { render, screen, fireEvent } from "@testing-library/react";
import SettingsSearch from "../shared/SettingsSearch";

describe("SettingsSearch", () => {
  it("renders search input with placeholder", () => {
    render(<SettingsSearch query="" onQueryChange={vi.fn()} />);
    expect(
      screen.getByPlaceholderText("Search settings...")
    ).toBeInTheDocument();
  });

  it("displays current query value", () => {
    render(<SettingsSearch query="lidarr" onQueryChange={vi.fn()} />);
    expect(screen.getByDisplayValue("lidarr")).toBeInTheDocument();
  });

  it("calls onQueryChange when typing", () => {
    const onQueryChange = vi.fn();
    render(<SettingsSearch query="" onQueryChange={onQueryChange} />);
    fireEvent.change(screen.getByPlaceholderText("Search settings..."), {
      target: { value: "plex" },
    });
    expect(onQueryChange).toHaveBeenCalledWith("plex");
  });
});
