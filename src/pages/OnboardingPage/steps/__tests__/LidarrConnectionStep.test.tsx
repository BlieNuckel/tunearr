import { render, screen, fireEvent } from "@testing-library/react";
import LidarrConnectionStep from "../LidarrConnectionStep";

const defaultProps = {
  url: "",
  apiKey: "",
  testing: false,
  testResult: null,
  onUrlChange: vi.fn(),
  onApiKeyChange: vi.fn(),
  onTest: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("LidarrConnectionStep", () => {
  it("renders URL and API key inputs", () => {
    render(<LidarrConnectionStep {...defaultProps} />);
    expect(screen.getByTestId("lidarr-url-input")).toBeInTheDocument();
    expect(screen.getByTestId("lidarr-apikey-input")).toBeInTheDocument();
  });

  it("renders description text", () => {
    render(<LidarrConnectionStep {...defaultProps} />);
    expect(
      screen.getByText(/Connect to your Lidarr instance/)
    ).toBeInTheDocument();
  });

  it("calls onUrlChange on URL input change", () => {
    render(<LidarrConnectionStep {...defaultProps} />);
    fireEvent.change(screen.getByTestId("lidarr-url-input"), {
      target: { value: "http://lidarr:8686" },
    });
    expect(defaultProps.onUrlChange).toHaveBeenCalledWith("http://lidarr:8686");
  });

  it("calls onApiKeyChange on API key input change", () => {
    render(<LidarrConnectionStep {...defaultProps} />);
    fireEvent.change(screen.getByTestId("lidarr-apikey-input"), {
      target: { value: "testkey" },
    });
    expect(defaultProps.onApiKeyChange).toHaveBeenCalledWith("testkey");
  });

  it("disables test button when url or apiKey empty", () => {
    render(<LidarrConnectionStep {...defaultProps} />);
    expect(screen.getByText("Test Connection")).toBeDisabled();
  });

  it("enables test button when both fields filled", () => {
    render(
      <LidarrConnectionStep
        {...defaultProps}
        url="http://lidarr:8686"
        apiKey="key"
      />
    );
    expect(screen.getByText("Test Connection")).not.toBeDisabled();
  });

  it("shows Testing... during test", () => {
    render(
      <LidarrConnectionStep
        {...defaultProps}
        url="http://lidarr:8686"
        apiKey="key"
        testing={true}
      />
    );
    expect(screen.getByText("Testing...")).toBeInTheDocument();
  });

  it("shows success message", () => {
    render(
      <LidarrConnectionStep
        {...defaultProps}
        testResult={{ success: true, version: "2.0.0" }}
      />
    );
    expect(screen.getByText("Connected! Lidarr v2.0.0")).toBeInTheDocument();
  });

  it("shows failure message", () => {
    render(
      <LidarrConnectionStep
        {...defaultProps}
        testResult={{ success: false, error: "Connection refused" }}
      />
    );
    expect(
      screen.getByText("Connection failed: Connection refused")
    ).toBeInTheDocument();
  });

  it("calls onTest when test button clicked", () => {
    render(
      <LidarrConnectionStep
        {...defaultProps}
        url="http://lidarr:8686"
        apiKey="key"
      />
    );
    fireEvent.click(screen.getByText("Test Connection"));
    expect(defaultProps.onTest).toHaveBeenCalled();
  });
});
