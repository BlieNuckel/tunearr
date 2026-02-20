import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ImageWithShimmer from "../ImageWithShimmer";

describe("ImageWithShimmer", () => {
  it("shows shimmer while loading", () => {
    render(<ImageWithShimmer src="https://example.com/img.jpg" alt="Test" />);

    const shimmer = document.querySelector(".animate-shimmer");
    expect(shimmer).toBeInTheDocument();
  });

  it("hides shimmer after image loads", async () => {
    render(<ImageWithShimmer src="https://example.com/img.jpg" alt="Test" />);

    const img = screen.getByAltText("Test");
    fireEvent.load(img);

    await waitFor(() => {
      const shimmer = document.querySelector(".animate-shimmer");
      expect(shimmer).not.toBeInTheDocument();
    });
  });

  it("applies custom className to image", () => {
    render(
      <ImageWithShimmer
        src="https://example.com/img.jpg"
        alt="Test"
        className="custom-class"
      />
    );

    const img = screen.getByAltText("Test");
    expect(img).toHaveClass("custom-class");
  });

  it("calls onError when image fails to load", () => {
    const onError = vi.fn();
    render(
      <ImageWithShimmer
        src="https://example.com/broken.jpg"
        alt="Test"
        onError={onError}
      />
    );

    const img = screen.getByAltText("Test");
    fireEvent.error(img);

    expect(onError).toHaveBeenCalled();
  });

  it("hides image when error occurs", () => {
    render(
      <ImageWithShimmer src="https://example.com/broken.jpg" alt="Test" />
    );

    const img = screen.getByAltText("Test");
    fireEvent.error(img);

    expect(screen.queryByAltText("Test")).not.toBeInTheDocument();
  });
});
