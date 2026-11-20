import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PlaceSearchField from "../PlaceSearchField";
import { describePlace } from "@/utils/describePlace";

const mockFetch = vi.fn();

const MALMO = {
  name: "Malmö",
  region: "Skåne County",
  country: "Sweden",
  countryCode: "SE",
  latitude: 55.6059,
  longitude: 13.0007,
  population: 362133,
};

function respond(places: unknown[]) {
  mockFetch.mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ places }),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", mockFetch);
  respond([MALMO]);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("PlaceSearchField", () => {
  it("looks a city up and hands back the whole place that was picked", async () => {
    const onPick = vi.fn();
    render(<PlaceSearchField onPick={onPick} />);

    await userEvent.type(screen.getByLabelText("Search a city"), "Malmö");
    await userEvent.click(screen.getByRole("button", { name: "Search" }));
    await userEvent.click(
      await screen.findByRole("button", { name: "Malmö, Skåne County, Sweden" })
    );

    expect(onPick).toHaveBeenCalledWith(MALMO);
    expect(screen.getByLabelText("Search a city")).toHaveValue(
      "Malmö, Skåne County, Sweden"
    );
  });

  it("searches on Enter as well as the button", async () => {
    render(<PlaceSearchField onPick={vi.fn()} />);

    await userEvent.type(
      screen.getByLabelText("Search a city"),
      "Malmö{Enter}"
    );

    expect(
      await screen.findByRole("button", { name: "Malmö, Skåne County, Sweden" })
    ).toBeInTheDocument();
  });

  it("says when nothing matched", async () => {
    respond([]);
    render(<PlaceSearchField onPick={vi.fn()} />);

    await userEvent.type(
      screen.getByLabelText("Search a city"),
      "Nowhere{Enter}"
    );

    expect(
      await screen.findByText("No place matched that.")
    ).toBeInTheDocument();
  });
});

describe("describePlace", () => {
  it("leaves out a missing region", () => {
    expect(describePlace({ ...MALMO, region: null })).toBe("Malmö, Sweden");
  });
});
