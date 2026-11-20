import { Entity, PrimaryColumn, Column, Index } from "typeorm";

/**
 * JamBase's answer for one MusicBrainz artist, shared by everyone who follows
 * them. A missing row means nobody has asked yet; a row with a null
 * `jambase_artist_id` is a confirmed miss, kept so the artist is not looked up
 * again. Rows outlive the last follow, so following an artist again costs no
 * lookup.
 */
@Entity("live_artists")
export class LiveArtist {
  @PrimaryColumn({ type: "text" })
  artist_mbid!: string;

  /** `jambase:219057`. Events key off this, since payloads never carry MBIDs. */
  @Index("idx_live_artists_jambase_artist_id")
  @Column({ type: "text", nullable: true })
  jambase_artist_id!: string | null;

  @Column({ type: "text" })
  resolved_at!: string;
}
