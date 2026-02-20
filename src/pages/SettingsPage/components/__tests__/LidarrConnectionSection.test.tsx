import { render, screen, fireEvent } from "@testing-library/react";
import LidarrConnectionSection from "../LidarrConnectionSection";

const defaultProps = {
  url: "",
  apiKey: "",
  testing: false,
  onUrlChange: vi.fn(),
  onApiKeyChange: vi.fn(),
  onTest: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("LidarrConnectionSection", () => {
  it("renders heading", () => {
    render(<LidarrConnectionSection {...defaultProps} />);
    expect(screen.getByText("Lidarr Connection")).toBeInTheDocument();
  });

  it("renders URL and API key inputs", () => {
    render(<LidarrConnectionSection {...defaultProps} />);
    expect(
      screen.getByPlaceholderText("http://localhost:8686")
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Enter API key")).toBeInTheDocument();
  });

  it("calls onUrlChange on URL input change", () => {
    render(<LidarrConnectionSection {...defaultProps} />);
    fireEvent.change(screen.getByPlaceholderText("http://localhost:8686"), {
      target: { value: "http://lidarr:8686" },
    });
    expect(defaultProps.onUrlChange).toHaveBeenCalledWith("http://lidarr:8686");
  });

  it("calls onApiKeyChange on API key input change", () => {
    render(<LidarrConnectionSection {...defaultProps} />);
    fireEvent.change(screen.getByPlaceholderText("Enter API key"), {
      target: { value: "testkey" },
    });
    expect(defaultProps.onApiKeyChange).toHaveBeenCalledWith("testkey");
  });

  it("disables test button when url or apiKey empty", () => {
    render(<LidarrConnectionSection {...defaultProps} />);
    expect(screen.getByText("Test Connection")).toBeDisabled();
  });

  it("enables test button when both fields filled", () => {
    render(
      <LidarrConnectionSection
        {...defaultProps}
        url="http://lidarr:8686"
        apiKey="key"
      />
    );
    expect(screen.getByText("Test Connection")).not.toBeDisabled();
  });

  it("shows Testing... during test", () => {
    render(
      <LidarrConnectionSection
        {...defaultProps}
        url="http://lidarr:8686"
        apiKey="key"
        testing={true}
      />
    );
    expect(screen.getByText("Testing...")).toBeInTheDocument();
  });

  it("calls onTest when button clicked", () => {
    render(
      <LidarrConnectionSection
        {...defaultProps}
        url="http://lidarr:8686"
        apiKey="key"
      />
    );
    fireEvent.click(screen.getByText("Test Connection"));
    expect(defaultProps.onTest).toHaveBeenCalled();
  });
});
