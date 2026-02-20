import { render, screen, fireEvent } from "@testing-library/react";
import PurchaseLinksModal from "../PurchaseLinksModal";

vi.mock("../../hooks/useManualImport", () => ({
  default: vi.fn(() => ({
    step: "idle",
    items: [],
    error: null,
    artistId: null,
    albumId: null,
    upload: vi.fn(),
    confirm: vi.fn(),
    cancel: vi.fn(),
    reset: vi.fn(),
  })),
}));

import useManualImport from "../../hooks/useManualImport";

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  artistName: "Radiohead",
  albumTitle: "OK Computer",
  albumMbid: "mbid-123",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("PurchaseLinksModal", () => {
  it("renders modal with album info", () => {
    render(<PurchaseLinksModal {...defaultProps} />);
    expect(screen.getByText("Purchase Options")).toBeInTheDocument();
    expect(screen.getByText("OK Computer by Radiohead")).toBeInTheDocument();
  });

  it("renders nothing when closed", () => {
    render(<PurchaseLinksModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByText("Purchase Options")).not.toBeInTheDocument();
  });

  it("shows file upload zone in idle step", () => {
    render(<PurchaseLinksModal {...defaultProps} />);
    expect(
      screen.getByText("Drop audio files here or click to browse")
    ).toBeInTheDocument();
  });

  it("shows uploading state", () => {
    vi.mocked(useManualImport).mockReturnValue({
      step: "uploading",
      items: [],
      error: null,
      uploadId: null,
      artistId: null,
      albumId: null,
      upload: vi.fn(),
      confirm: vi.fn(),
      cancel: vi.fn(),
      reset: vi.fn(),
    });

    render(<PurchaseLinksModal {...defaultProps} />);
    expect(
      screen.getByText("Uploading and scanning files...")
    ).toBeInTheDocument();
  });

  it("shows importing state", () => {
    vi.mocked(useManualImport).mockReturnValue({
      step: "importing",
      items: [],
      error: null,
      uploadId: null,
      artistId: null,
      albumId: null,
      upload: vi.fn(),
      confirm: vi.fn(),
      cancel: vi.fn(),
      reset: vi.fn(),
    });

    render(<PurchaseLinksModal {...defaultProps} />);
    expect(screen.getByText("Importing to Lidarr...")).toBeInTheDocument();
  });

  it("shows done state", () => {
    vi.mocked(useManualImport).mockReturnValue({
      step: "done",
      items: [],
      error: null,
      uploadId: null,
      artistId: null,
      albumId: null,
      upload: vi.fn(),
      confirm: vi.fn(),
      cancel: vi.fn(),
      reset: vi.fn(),
    });

    render(<PurchaseLinksModal {...defaultProps} />);
    expect(
      screen.getByText("Files imported successfully!")
    ).toBeInTheDocument();
  });

  it("shows error state with try again button", () => {
    const reset = vi.fn();
    vi.mocked(useManualImport).mockReturnValue({
      step: "error",
      items: [],
      error: "Upload failed",
      uploadId: null,
      artistId: null,
      albumId: null,
      upload: vi.fn(),
      confirm: vi.fn(),
      cancel: vi.fn(),
      reset,
    });

    render(<PurchaseLinksModal {...defaultProps} />);
    expect(screen.getByText("Upload failed")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Try again"));
    expect(reset).toHaveBeenCalled();
  });

  it("shows Add to Library button when onAddToLibrary provided", () => {
    render(<PurchaseLinksModal {...defaultProps} onAddToLibrary={vi.fn()} />);
    expect(screen.getByText("Add to Library")).toBeInTheDocument();
    expect(screen.getByText("Cancel")).toBeInTheDocument();
  });

  it("shows Close button when no onAddToLibrary", () => {
    render(<PurchaseLinksModal {...defaultProps} />);
    expect(screen.getByText("Close")).toBeInTheDocument();
    expect(screen.queryByText("Add to Library")).not.toBeInTheDocument();
  });

  it("calls onAddToLibrary and onClose when Add to Library clicked", () => {
    const onAddToLibrary = vi.fn();
    const onClose = vi.fn();
    render(
      <PurchaseLinksModal
        {...defaultProps}
        onClose={onClose}
        onAddToLibrary={onAddToLibrary}
      />
    );

    fireEvent.click(screen.getByText("Add to Library"));
    expect(onAddToLibrary).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it("calls cancel on close during reviewing step", () => {
    const cancel = vi.fn();
    const onClose = vi.fn();
    vi.mocked(useManualImport).mockReturnValue({
      step: "reviewing",
      items: [],
      error: null,
      uploadId: "u1",
      artistId: null,
      albumId: null,
      upload: vi.fn(),
      confirm: vi.fn(),
      cancel,
      reset: vi.fn(),
    });

    render(<PurchaseLinksModal {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByText("Close"));
    expect(cancel).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });
});
