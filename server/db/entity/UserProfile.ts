import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { User } from "./User";

/**
 * The derived, regenerable profile document persisted as `profile_json`.
 * Adding a field here is migration-free: bump {@link DERIVED_PROFILE_SCHEMA_VERSION}
 * and a version mismatch marks the stored row stale so it regenerates.
 */
export type DerivedProfile = {
  genreVector: { tag: string; weight: number; fromArtists: string[] }[];
  explorationHistory: { albums: string[]; artists: string[] };
};

export const DERIVED_PROFILE_SCHEMA_VERSION = 1;

/** Derived, regenerable cache — one row per user, the whole profile as one document. */
@Entity("user_profiles")
export class UserProfile {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index("idx_user_profiles_user_id", { unique: true })
  @Column({ type: "integer" })
  user_id!: number;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user!: User;

  @Column({ type: "text" })
  profile_json!: string;

  @Column({ type: "integer" })
  schema_version!: number;

  @Column({ type: "text" })
  config_hash!: string;

  @Column({ type: "text" })
  generated_at!: string;

  @Column({ type: "text" })
  last_used_at!: string;
}
