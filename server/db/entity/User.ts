import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";
import { Permission } from "../../../shared/permissions";

export type UserType = "local" | "plex";

@Entity("users")
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "text", nullable: true, unique: true })
  username!: string | null;

  @Column({ type: "text", nullable: true })
  password_hash!: string | null;

  @Index("idx_users_plex_id")
  @Column({ type: "text", nullable: true, unique: true })
  plex_id!: string | null;

  @Column({ type: "text", nullable: true })
  plex_email!: string | null;

  @Column({ type: "text", nullable: true })
  plex_thumb!: string | null;

  @Column({ type: "integer", default: Permission.REQUEST })
  permissions!: number;

  @Column({ type: "integer", default: 1 })
  enabled!: number;

  @CreateDateColumn({ type: "text" })
  created_at!: string;

  @UpdateDateColumn({ type: "text" })
  updated_at!: string;

  @Column({ type: "text", default: "system" })
  theme!: "light" | "dark" | "system";

  @Column({ type: "text", nullable: true })
  plex_username!: string | null;

  @Column({ type: "text", nullable: true })
  plex_token!: string | null;

  @Column({ type: "text", default: "local" })
  user_type!: UserType;

  /**
   * Where live dates are measured from. Null means the user has not set one, so
   * tours lead with the soonest date instead of the closest.
   */
  @Column({ type: "real", nullable: true })
  live_lat!: number | null;

  @Column({ type: "real", nullable: true })
  live_lon!: number | null;

  /** What the user picked, for showing back ("Malmö, Skåne, Sweden"). */
  @Column({ type: "text", nullable: true })
  live_place!: string | null;

  /**
   * ISO 4217 code every purchase is recorded in. Null until the user sets up
   * purchases; once set it can be changed but not cleared.
   */
  @Column({ type: "text", nullable: true })
  spending_currency!: string | null;

  /** Soft monthly budget in minor units of `spending_currency`. Null means no limit. */
  @Column({ type: "integer", nullable: true })
  spending_monthly_limit!: number | null;
}
