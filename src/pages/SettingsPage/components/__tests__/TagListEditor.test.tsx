import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TagListEditor from "../TagListEditor";

describe("TagListEditor", () => {
  const defaultProps = {
    tags: ["rock", "jazz", "pop"],
    onTagsChange: vi.fn(),
  };

  it("renders all tags as removable pills", () => {
    render(<TagListEditor {...defaultProps} />);

    expect(screen.getByText("rock")).toBeInTheDocument();
    expect(screen.getByText("jazz")).toBeInTheDocument();
    expect(screen.getByText("pop")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /remove/i })).toHaveLength(3);
  });

  it("removes a tag when its remove button is clicked", async () => {
    const onTagsChange = vi.fn();
    render(
      <TagListEditor tags={["rock", "jazz", "pop"]} onTagsChange={onTagsChange} />
    );

    await userEvent.click(screen.getByRole("button", { name: "Remove jazz" }));
    expect(onTagsChange).toHaveBeenCalledWith(["rock", "pop"]);
  });

  it("adds a tag via the Add button", async () => {
    const onTagsChange = vi.fn();
    render(
      <TagListEditor tags={["rock"]} onTagsChange={onTagsChange} />
    );

    await userEvent.type(screen.getByPlaceholderText("Add a tag..."), "blues");
    await userEvent.click(screen.getByRole("button", { name: "Add" }));

    expect(onTagsChange).toHaveBeenCalledWith(["rock", "blues"]);
  });

  it("adds a tag on Enter key", async () => {
    const onTagsChange = vi.fn();
    render(
      <TagListEditor tags={["rock"]} onTagsChange={onTagsChange} />
    );

    const input = screen.getByPlaceholderText("Add a tag...");
    await userEvent.type(input, "blues{Enter}");

    expect(onTagsChange).toHaveBeenCalledWith(["rock", "blues"]);
  });

  it("clears input after adding a tag", async () => {
    render(
      <TagListEditor tags={[]} onTagsChange={vi.fn()} />
    );

    const input = screen.getByPlaceholderText("Add a tag...");
    await userEvent.type(input, "blues{Enter}");

    expect(input).toHaveValue("");
  });

  it("rejects duplicate tags case-insensitively", async () => {
    const onTagsChange = vi.fn();
    render(
      <TagListEditor tags={["Rock"]} onTagsChange={onTagsChange} />
    );

    await userEvent.type(screen.getByPlaceholderText("Add a tag..."), "rock{Enter}");
    expect(onTagsChange).not.toHaveBeenCalled();
  });

  it("rejects empty input", async () => {
    const onTagsChange = vi.fn();
    render(
      <TagListEditor tags={[]} onTagsChange={onTagsChange} />
    );

    await userEvent.click(screen.getByRole("button", { name: "Add" }));
    expect(onTagsChange).not.toHaveBeenCalled();
  });

  it("rejects whitespace-only input", async () => {
    const onTagsChange = vi.fn();
    render(
      <TagListEditor tags={[]} onTagsChange={onTagsChange} />
    );

    await userEvent.type(screen.getByPlaceholderText("Add a tag..."), "   {Enter}");
    expect(onTagsChange).not.toHaveBeenCalled();
  });

  it("renders empty state with no tags", () => {
    render(<TagListEditor tags={[]} onTagsChange={vi.fn()} />);

    expect(screen.queryAllByRole("button", { name: /remove/i })).toHaveLength(0);
    expect(screen.getByPlaceholderText("Add a tag...")).toBeInTheDocument();
  });
});
