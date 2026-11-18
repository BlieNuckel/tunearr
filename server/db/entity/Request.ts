import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { User } from "./User";

export type RequestStatus = "pending" | "approved" | "declined";

export type LidarrLifecycleStatus =
  "wanted" | "downloading" | "imported" | "failed";

@Entity("requests")
export class Request {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index("idx_requests_user_id")
  @Column({ type: "integer" })
  user_id!: number;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user!: User;

  @Index("idx_requests_album_mbid")
  @Column({ type: "text" })
  album_mbid!: string;

  @Column({ type: "text" })
  artist_name!: string;

  @Column({ type: "text" })
  album_title!: string;

  @Index("idx_requests_status")
  @Column({ type: "text", default: "pending" })
  status!: RequestStatus;

  @Index("idx_requests_lidarr_status")
  @Column({ type: "text", nullable: true })
  lidarr_status!: LidarrLifecycleStatus | null;

  @Column({ type: "integer", nullable: true })
  approved_by!: number | null;

  @Column({ type: "text", nullable: true })
  approved_at!: string | null;

  /** When Lidarr imported the album, which is when the requester can play it. */
  @Column({ type: "text", nullable: true })
  available_at!: string | null;

  /** The requester has seen enough of the "it's here" highlight on Home. */
  @Column({ type: "text", nullable: true })
  highlight_dismissed_at!: string | null;

  @CreateDateColumn({ type: "text" })
  created_at!: string;

  @UpdateDateColumn({ type: "text" })
  updated_at!: string;
}
