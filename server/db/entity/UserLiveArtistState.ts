import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Unique,
} from "typeorm";
import { User } from "./User";

/**
 * What a user already knows about one followed artist's tour: the closest
 * upcoming date when it was last checked, or "checked, no dates" when
 * `closest_event_id` is null. Notifications fire only against this, so a
 * missing row (never checked) is recorded silently and kept distinct from a
 * row with no dates, whose first dates are news.
 */
@Entity("user_live_artist_state")
@Unique("uq_user_live_artist_state", ["user_id", "artist_mbid"])
export class UserLiveArtistState {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "integer" })
  user_id!: number;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user!: User;

  @Column({ type: "text" })
  artist_mbid!: string;

  @Column({ type: "integer", nullable: true })
  closest_event_id!: number | null;

  /** Null when the user had no location, or the venue had no coordinates. */
  @Column({ type: "real", nullable: true })
  closest_distance_km!: number | null;

  /** The location the distance was measured from, so a move re-records silently. */
  @Column({ type: "real", nullable: true })
  origin_lat!: number | null;

  @Column({ type: "real", nullable: true })
  origin_lon!: number | null;

  @Column({ type: "text" })
  evaluated_at!: string;

  @Column({ type: "text", nullable: true })
  notified_at!: string | null;

  /** Hides the Highlights card until a closer date is announced. */
  @Column({ type: "text", nullable: true })
  dismissed_at!: string | null;
}
