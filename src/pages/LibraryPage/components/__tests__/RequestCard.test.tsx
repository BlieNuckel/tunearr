import { render, screen, fireEvent } from "@testing-library/react";
import RequestCard from "../RequestCard";
import { RequestItem } from "@/types";

const baseRequest: RequestItem = {
  id: 1,
  albumMbid: "abc-123",
  artistName: "Radiohead",
  albumTitle: "OK Computer",
  status: "pending",
  createdAt: "2024-01-15T00:00:00Z",
  updatedAt: "2024-01-15T00:00:00Z",
  approvedAt: null,
  user: { id: 1, username: "testuser", thumb: null },
};

describe("RequestCard", () => {
  it("renders album title and artist name", () => {
    render(<RequestCard request={baseRequest} index={0} />);

    expect(screen.getByText("OK Computer")).toBeInTheDocument();
    expect(screen.getByText("Radiohead")).toBeInTheDocument();
  });

  it("renders status badge", () => {
    render(<RequestCard request={baseRequest} index={0} />);

    const badge = screen.getByTestId("status-badge");
    expect(badge).toHaveAttribute("data-status", "pending");
  });

  it("shows approved status", () => {
    const approved = { ...baseRequest, status: "approved" as const };
    render(<RequestCard request={approved} index={0} />);

    const badge = screen.getByTestId("status-badge");
    expect(badge).toHaveAttribute("data-status", "approved");
  });

  it("shows declined status", () => {
    const declined = { ...baseRequest, status: "declined" as const };
    render(<RequestCard request={declined} index={0} />);

    const badge = screen.getByTestId("status-badge");
    expect(badge).toHaveAttribute("data-status", "declined");
  });

  it("does not show user info by default", () => {
    render(<RequestCard request={baseRequest} index={0} />);

    expect(screen.queryByText("testuser")).not.toBeInTheDocument();
  });

  it("shows user info when showUser is true", () => {
    render(<RequestCard request={baseRequest} index={0} showUser />);

    expect(screen.getByText("testuser")).toBeInTheDocument();
  });

  it("shows user thumb when available", () => {
    const withThumb = {
      ...baseRequest,
      user: {
        id: 1,
        username: "testuser",
        thumb: "https://example.com/thumb.jpg",
      },
    };
    const { container } = render(
      <RequestCard request={withThumb} index={0} showUser />
    );

    const img = container.querySelector("img");
    expect(img).toHaveAttribute("src", "https://example.com/thumb.jpg");
  });

  it("does not show action buttons by default", () => {
    render(<RequestCard request={baseRequest} index={0} />);

    expect(screen.queryByLabelText("Approve request")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Decline request")).not.toBeInTheDocument();
  });

  it("shows action buttons for pending requests when showActions is true", () => {
    render(<RequestCard request={baseRequest} index={0} showActions />);

    expect(screen.getByLabelText("Approve request")).toBeInTheDocument();
    expect(screen.getByLabelText("Decline request")).toBeInTheDocument();
  });

  it("hides action buttons for non-pending requests even with showActions", () => {
    const approved = { ...baseRequest, status: "approved" as const };
    render(<RequestCard request={approved} index={0} showActions />);

    expect(screen.queryByLabelText("Approve request")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Decline request")).not.toBeInTheDocument();
  });

  it("calls onApprove when approve button is clicked", () => {
    const onApprove = vi.fn();
    render(
      <RequestCard
        request={baseRequest}
        index={0}
        showActions
        onApprove={onApprove}
      />
    );

    fireEvent.click(screen.getByLabelText("Approve request"));
    expect(onApprove).toHaveBeenCalledWith(1);
  });

  it("calls onDecline when decline button is clicked", () => {
    const onDecline = vi.fn();
    render(
      <RequestCard
        request={baseRequest}
        index={0}
        showActions
        onDecline={onDecline}
      />
    );

    fireEvent.click(screen.getByLabelText("Decline request"));
    expect(onDecline).toHaveBeenCalledWith(1);
  });

  it("falls back to albumMbid when albumTitle is null", () => {
    const noTitle = { ...baseRequest, albumTitle: null };
    render(<RequestCard request={noTitle} index={0} />);

    expect(screen.getByText("abc-123")).toBeInTheDocument();
  });

  it("shows 'Unknown Artist' when artistName is null", () => {
    const noArtist = { ...baseRequest, artistName: null };
    render(<RequestCard request={noArtist} index={0} />);

    expect(screen.getByText("Unknown Artist")).toBeInTheDocument();
  });
});
