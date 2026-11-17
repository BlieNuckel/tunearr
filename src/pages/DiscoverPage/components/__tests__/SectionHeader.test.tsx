import { render, screen } from "@testing-library/react";
import SectionHeader from "../SectionHeader";

describe("SectionHeader", () => {
  it("renders the title as a heading", () => {
    render(<SectionHeader title="New releases" />);
    expect(
      screen.getByRole("heading", { name: "New releases" })
    ).toBeInTheDocument();
  });

  it("renders the action when provided", () => {
    render(
      <SectionHeader title="New releases" action={<button>See all</button>} />
    );
    expect(screen.getByRole("button", { name: "See all" })).toBeInTheDocument();
  });
});
