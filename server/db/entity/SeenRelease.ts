import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
  Unique,
} from "typeorm";
import { FollowedArtist } from "./FollowedArtist";

export type ReleaseSource = "musicbrainz" | "deezer" | "apple";

@Entity("seen_releases")
@Unique("uq_seen_follow_release", ["followed_artist_id", "release_key"])
export class SeenRelease {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index("idx_seen_followed_artist_id")
  @Column({ type: "integer" })
  followed_artist_id!: number;

  @ManyToOne(() => FollowedArtist, { onDelete: "CASCADE" })
  @JoinColumn({ name: "followed_artist_id" })
  followed_artist!: FollowedArtist;

  @Column({ type: "text" })
  release_key!: string;

  @Column({ type: "text" })
  source!: ReleaseSource;

  @Column({ type: "text" })
  album_title!: string;

  @Column({ type: "text", nullable: true })
  release_date!: string | null;

  @Column({ type: "text", nullable: true })
  external_id!: string | null;

  @CreateDateColumn({ type: "text" })
  notified_at!: string;
}
