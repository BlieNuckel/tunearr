import { render, screen } from "@testing-library/react";
import {
  GoingBadge,
  LiveLoadError,
  StatusBadge,
  TicketsLink,
} from "../LiveEventBits";

describe("StatusBadge", () => {
  it("labels a changed show", () => {
    render(<StatusBadge status="cancelled" />);
    expect(screen.getByText("Cancelled")).toBeInTheDocument();
  });

  it("shows nothing for a show still on as planned", () => {
    const { container } = render(<StatusBadge status="scheduled" />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("GoingBadge", () => {
  it("says going", () => {
    render(<GoingBadge />);
    expect(screen.getByText("Going")).toBeInTheDocument();
  });
});

describe("TicketsLink", () => {
  it("opens the ticket page in a new tab", () => {
    render(<TicketsLink url="https://tickets.test/1" />);
    const link = screen.getByRole("link", { name: "Tickets" });
    expect(link).toHaveAttribute("href", "https://tickets.test/1");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
  });

  it("shows nothing without a url", () => {
    const { container } = render(<TicketsLink url={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("LiveLoadError", () => {
  it("says the dates could not be loaded", () => {
    render(<LiveLoadError />);
    expect(screen.getByText("Could not load live dates")).toBeInTheDocument();
  });
});
