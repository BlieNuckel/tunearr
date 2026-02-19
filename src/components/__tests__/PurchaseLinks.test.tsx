import { render, screen } from "@testing-library/react";
import PurchaseLinks from "../PurchaseLinks";

describe("PurchaseLinks", () => {
  it("renders Bandcamp and Qobuz links with encoded query", () => {
    render(<PurchaseLinks artistName="Radiohead" albumTitle="OK Computer" />);

    const bandcampLink = screen.getByText("Bandcamp").closest("a")!;
    const qobuzLink = screen.getByText("Qobuz").closest("a")!;

    const expected = encodeURIComponent("Radiohead OK Computer");
    expect(bandcampLink).toHaveAttribute(
      "href",
      `https://bandcamp.com/search?q=${expected}`
    );
    expect(qobuzLink).toHaveAttribute(
      "href",
      `https://www.qobuz.com/us-en/search?q=${expected}`
    );
  });

  it("opens links in new tab", () => {
    render(<PurchaseLinks artistName="Test" albumTitle="Album" />);

    const links = screen.getAllByRole("link");
    links.forEach((link) => {
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    });
  });
});
