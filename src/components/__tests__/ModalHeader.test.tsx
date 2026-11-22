import { render, screen } from "@testing-library/react";
import ModalHeader from "../ModalHeader";

describe("ModalHeader", () => {
  it("titles the modal with a heading", () => {
    render(<ModalHeader title="Log Details" />);
    expect(
      screen.getByRole("heading", { name: "Log Details" })
    ).toBeInTheDocument();
  });

  it("shows a subtitle under the title", () => {
    render(
      <ModalHeader title="Record Purchase" subtitle="Kid A by Radiohead" />
    );
    expect(screen.getByText("Kid A by Radiohead")).toBeInTheDocument();
  });

  it("leaves out the subtitle when there is none", () => {
    const { container } = render(<ModalHeader title="Set up purchases" />);
    expect(container.querySelectorAll("p")).toHaveLength(0);
  });

  it("renders extra header content after the subtitle", () => {
    render(
      <ModalHeader title="Purchase Options" subtitle="Kid A by Radiohead">
        <span>XL Recordings</span>
      </ModalHeader>
    );
    expect(screen.getByText("XL Recordings")).toBeInTheDocument();
  });

  it("passes its class to the wrapper", () => {
    const { container } = render(<ModalHeader title="T" className="mb-4" />);
    expect(container.firstChild).toHaveClass("mb-4");
  });
});
