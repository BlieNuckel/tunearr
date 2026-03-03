import { renderHook, act, waitFor } from "@testing-library/react";
import { useUsers } from "../useUsers";

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.restoreAllMocks();
});

const mockUsers = [
  { id: 1, username: "admin", role: "admin", enabled: true, theme: "system", thumb: null },
  { id: 2, username: "user1", role: "user", enabled: true, theme: "dark", thumb: "https://thumb.jpg" },
];

describe("useUsers", () => {
  it("fetches users on mount", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify(mockUsers), { status: 200 })
    );

    const { result } = renderHook(() => useUsers());

    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.users).toHaveLength(2);
    expect(result.current.users[0].username).toBe("admin");
    expect(result.current.error).toBeNull();
  });

  it("handles fetch error", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response("Server error", { status: 500 })
    );

    const { result } = renderHook(() => useUsers());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe("Failed to fetch users");
    expect(result.current.users).toHaveLength(0);
  });

  it("updateRole calls API and refetches", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response(JSON.stringify(mockUsers), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: true }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(mockUsers), { status: 200 }));

    const { result } = renderHook(() => useUsers());

    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(() => result.current.updateRole(2, "admin"));

    expect(vi.mocked(fetch)).toHaveBeenCalledWith("/api/users/2/role", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "admin" }),
    });
  });

  it("toggleEnabled calls API and refetches", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response(JSON.stringify(mockUsers), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: true }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(mockUsers), { status: 200 }));

    const { result } = renderHook(() => useUsers());

    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(() => result.current.toggleEnabled(2, false));

    expect(vi.mocked(fetch)).toHaveBeenCalledWith("/api/users/2/enabled", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: false }),
    });
  });

  it("removeUser calls API and refetches", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response(JSON.stringify(mockUsers), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: true }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([mockUsers[0]]), { status: 200 }));

    const { result } = renderHook(() => useUsers());

    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(() => result.current.removeUser(2));

    expect(vi.mocked(fetch)).toHaveBeenCalledWith("/api/users/2", {
      method: "DELETE",
    });
  });

  it("updateRole throws on API error", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response(JSON.stringify(mockUsers), { status: 200 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: "Cannot demote the last admin" }), { status: 400 })
      );

    const { result } = renderHook(() => useUsers());

    await waitFor(() => expect(result.current.loading).toBe(false));

    await expect(act(() => result.current.updateRole(1, "user"))).rejects.toThrow(
      "Cannot demote the last admin"
    );
  });
});
