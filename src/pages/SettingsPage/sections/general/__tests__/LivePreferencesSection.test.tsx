import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LivePreferencesSection from "../LivePreferencesSection";

const mockFetch = vi.fn();
const mockGetCurrentPosition = vi.fn();

const MALMO_PLACE = {
  name: "Malmö",
  region: "Skåne County",
  country: "Sweden",
  countryCode: "SE",
  latitude: 55.6059,
  longitude: 13.0007,
  population: 362133,
};

type Route = { ok?: boolean; body: unknown };

/** Answers each URL (and PATCH) with its own response. */
function serve(routes: Record<string, Route>) {
  mockFetch.mockImplementation((url: string, init?: RequestInit) => {
    const key = init?.method === "PATCH" ? `PATCH ${url}` : url;
    const route = routes[key] ?? routes[url];
    return Promise.resolve({
      ok: route?.ok ?? true,
      json: () => Promise.resolve(route?.body ?? {}),
    });
  });
}

function patchBodies(): unknown[] {
  return mockFetch.mock.calls
    .filter(([, init]) => (init as RequestInit | undefined)?.method === "PATCH")
    .map(([, init]) => JSON.parse((init as RequestInit).body as string));
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", mockFetch);
  vi.stubGlobal("isSecureContext", true);
  vi.stubGlobal("navigator", {
    geolocation: { getCurrentPosition: mockGetCurrentPosition },
  });
  serve({ "/api/live/preferences": { body: { location: null } } });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("LivePreferencesSection", () => {
  it("says there is no location yet and what that means", async () => {
    render(<LivePreferencesSection />);

    expect(await screen.findByText("Not set")).toBeInTheDocument();
    expect(screen.getByText(/next date leads instead/)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Clear" })
    ).not.toBeInTheDocument();
  });

  it("shows the place the user picked", async () => {
    serve({
      "/api/live/preferences": {
        body: {
          location: {
            lat: 55.6,
            lon: 13,
            place: "Malmö, Skåne County, Sweden",
          },
        },
      },
    });

    render(<LivePreferencesSection />);

    expect(
      await screen.findByText("Malmö, Skåne County, Sweden")
    ).toBeInTheDocument();
    expect(screen.getByText(/closest to here leads/)).toBeInTheDocument();
  });

  it("shows bare coordinates when there is no place name", async () => {
    serve({
      "/api/live/preferences": {
        body: { location: { lat: 55.6059, lon: 13.0007, place: null } },
      },
    });

    render(<LivePreferencesSection />);

    expect(await screen.findByText("55.61, 13.00")).toBeInTheDocument();
  });

  it("saves a searched city with its name", async () => {
    serve({
      "/api/live/preferences": { body: { location: null } },
      "/api/live/geocode?q=Malm%C3%B6": { body: { places: [MALMO_PLACE] } },
    });
    render(<LivePreferencesSection />);
    await screen.findByText("Not set");

    await userEvent.type(
      screen.getByLabelText("Search a city"),
      "Malmö{Enter}"
    );
    await userEvent.click(
      await screen.findByRole("button", { name: "Malmö, Skåne County, Sweden" })
    );

    await waitFor(() =>
      expect(patchBodies()).toEqual([
        {
          location: {
            lat: 55.6059,
            lon: 13.0007,
            place: "Malmö, Skåne County, Sweden",
          },
        },
      ])
    );
  });

  it("saves the browser's position without a name", async () => {
    mockGetCurrentPosition.mockImplementation((onSuccess) =>
      onSuccess({ coords: { latitude: 55.60587, longitude: 13.00073 } })
    );
    render(<LivePreferencesSection />);
    await screen.findByText("Not set");

    await userEvent.click(
      screen.getByRole("button", { name: "Use my location" })
    );

    await waitFor(() =>
      expect(patchBodies()).toEqual([
        { location: { lat: 55.6059, lon: 13.0007, place: null } },
      ])
    );
  });

  it("explains a refused browser location", async () => {
    mockGetCurrentPosition.mockImplementation((_onSuccess, onError) =>
      onError({ code: 1 })
    );
    render(<LivePreferencesSection />);
    await screen.findByText("Not set");

    await userEvent.click(
      screen.getByRole("button", { name: "Use my location" })
    );

    expect(
      await screen.findByText(/Location permission was denied/)
    ).toBeInTheDocument();
  });

  it("clears the location", async () => {
    serve({
      "/api/live/preferences": {
        body: { location: { lat: 55.6, lon: 13, place: "Malmö" } },
      },
    });
    render(<LivePreferencesSection />);

    await userEvent.click(await screen.findByRole("button", { name: "Clear" }));

    await waitFor(() => expect(patchBodies()).toEqual([{ location: null }]));
  });

  it("shows why a save was refused", async () => {
    mockGetCurrentPosition.mockImplementation((onSuccess) =>
      onSuccess({ coords: { latitude: 55.6, longitude: 13 } })
    );
    serve({
      "/api/live/preferences": { body: { location: null } },
      "PATCH /api/live/preferences": {
        ok: false,
        body: { error: "That is not a valid coordinate" },
      },
    });
    render(<LivePreferencesSection />);
    await screen.findByText("Not set");

    await userEvent.click(
      screen.getByRole("button", { name: "Use my location" })
    );

    expect(
      await screen.findByText("That is not a valid coordinate")
    ).toBeInTheDocument();
  });

  it("renders nothing until the location has loaded", () => {
    mockFetch.mockImplementation(() => new Promise(() => {}));

    const { container } = render(<LivePreferencesSection />);

    expect(container).toBeEmptyDOMElement();
  });
});
