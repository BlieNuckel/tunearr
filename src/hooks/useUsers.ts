import { useState, useEffect, useCallback } from "react";

type ManagedUser = {
  id: number;
  username: string;
  userType: "local" | "plex";
  permissions: number;
  enabled: boolean;
  thumb: string | null;
};

type CreateUserPayload = {
  username: string;
  password: string;
  permissions: number;
};

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  if (res.status === 204) return undefined as T;
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

export type { ManagedUser, CreateUserPayload };

export function useUsers() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchJson<ManagedUser[]>("/api/users");
      setUsers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const createUser = useCallback(async (payload: CreateUserPayload) => {
    const user = await fetchJson<ManagedUser>("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setUsers((prev) => [...prev, user]);
    return user;
  }, []);

  const updatePermissions = useCallback(
    async (userId: number, permissions: number) => {
      const user = await fetchJson<ManagedUser>(
        `/api/users/${userId}/permissions`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ permissions }),
        }
      );
      setUsers((prev) => prev.map((u) => (u.id === userId ? user : u)));
      return user;
    },
    []
  );

  const toggleEnabled = useCallback(async (userId: number) => {
    const user = await fetchJson<ManagedUser>(
      `/api/users/${userId}/toggle-enabled`,
      { method: "PATCH" }
    );
    setUsers((prev) => prev.map((u) => (u.id === userId ? user : u)));
    return user;
  }, []);

  const removeUser = useCallback(async (userId: number) => {
    await fetchJson<void>(`/api/users/${userId}`, { method: "DELETE" });
    setUsers((prev) => prev.filter((u) => u.id !== userId));
  }, []);

  return {
    users,
    loading,
    error,
    createUser,
    updatePermissions,
    toggleEnabled,
    removeUser,
    reload: load,
  };
}
