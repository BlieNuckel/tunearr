import type Database from "better-sqlite3";

export type UserRole = "admin" | "user";

export type User = {
  id: number;
  username: string | null;
  password_hash: string | null;
  plex_id: string | null;
  plex_email: string | null;
  plex_thumb: string | null;
  role: UserRole;
  enabled: 0 | 1;
  created_at: string;
  updated_at: string;
};

export type Session = {
  id: number;
  token: string;
  user_id: number;
  expires_at: string;
  created_at: string;
};

export type Migration = {
  id: number;
  version: number;
  name: string;
  applied_at: string;
};

export type DatabaseInstance = Database.Database;
