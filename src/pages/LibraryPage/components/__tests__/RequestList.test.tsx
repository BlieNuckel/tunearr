import { render, screen } from "@testing-library/react";
import RequestList from "../RequestList";
import { RequestItem } from "@/types";

const mockRequests: RequestItem[] = [
  {
    id: 1,
    albumMbid: "abc-123",
    artistName: "Radiohead",
    albumTitle: "OK Computer",
    status: "pending",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    approvedAt: null,
    user: { id: 1, username: "testuser", thumb: null },
  },
  {
    id: 2,
    albumMbid: "def-456",
    artistName: "Bjork",
    albumTitle: "Homogenic",
    status: "approved",
    createdAt: "2024-01-02T00:00:00Z",
    updatedAt: "2024-01-02T00:00:00Z",
    approvedAt: "2024-01-03T00:00:00Z",
    user: { id: 2, username: "admin", thumb: null },
  },
];

describe("RequestList", () => {
  it("shows loading skeletons when loading", () => {
    const { container } = render(
      <RequestList
        requests={[]}
        loading={true}
        error={null}
        emptyMessage="No requests"
      />
    );

    const skeletons = container.querySelectorAll(".animate-shimmer");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("shows error message", () => {
    render(
      <RequestList
        requests={[]}
        loading={false}
        error="Something went wrong"
        emptyMessage="No requests"
      />
    );

    expect(
      screen.getByText("Failed to load requests: Something went wrong")
    ).toBeInTheDocument();
  });

  it("shows empty message when no requests", () => {
    render(
      <RequestList
        requests={[]}
        loading={false}
        error={null}
        emptyMessage="You haven't made any requests yet"
      />
    );

    expect(
      screen.getByText("You haven't made any requests yet")
    ).toBeInTheDocument();
  });

  it("renders all request cards", () => {
    render(
      <RequestList
        requests={mockRequests}
        loading={false}
        error={null}
        emptyMessage="No requests"
      />
    );

    expect(screen.getByText("OK Computer")).toBeInTheDocument();
    expect(screen.getByText("Homogenic")).toBeInTheDocument();
  });
});
