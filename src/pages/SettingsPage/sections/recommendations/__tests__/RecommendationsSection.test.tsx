import { render, screen, fireEvent } from "@testing-library/react";
import RecommendationsSection from "../RecommendationsSection";
import { DEFAULT_PROMOTED_ALBUM } from "@/context/promotedAlbumDefaults";

describe("RecommendationsSection — ratings backup toggle", () => {
  it("reflects ratingsBackupEnabled and toggles it off", () => {
    const onChange = vi.fn();
    render(
      <RecommendationsSection
        config={DEFAULT_PROMOTED_ALBUM}
        onConfigChange={onChange}
      />
    );

    const checkbox = screen.getByLabelText(/Back up Plex ratings/i);
    expect(checkbox).toBeChecked();

    fireEvent.click(checkbox);

    expect(onChange).toHaveBeenCalledWith({
      ...DEFAULT_PROMOTED_ALBUM,
      ratingsBackupEnabled: false,
    });
  });
});
