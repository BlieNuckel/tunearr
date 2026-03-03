import { useState, useEffect, useCallback } from "react";

type User = {
  id: number;
  username: string;
  role: "admin" | "user";
  enabled: boolean;
  theme: string;
  thumb: string | null;
};

export function useUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/users");
      if (!res.ok) throw new Error("Failed to fetch users");
      setUsers(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const updateRole = useCallback(
    async (id: number, role: "admin" | "user") => {
      const res = await fetch(`/api/users/${id}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update role");
      }
      await fetchUsers();
    },
    [fetchUsers]
  );

  const toggleEnabled = useCallback(
    async (id: number, enabled: boolean) => {
      const res = await fetch(`/api/users/${id}/enabled`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update user");
      }
      await fetchUsers();
    },
    [fetchUsers]
  );

  const removeUser = useCallback(
    async (id: number) => {
      const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete user");
      }
      await fetchUsers();
    },
    [fetchUsers]
  );

  return { users, loading, error, updateRole, toggleEnabled, removeUser, refetch: fetchUsers };
}
