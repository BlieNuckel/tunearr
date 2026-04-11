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
import { User } from "./User";

@Entity("purchases")
@Unique("uq_purchase_user_album", ["user_id", "album_mbid"])
export class Purchase {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index("idx_purchase_user_id")
  @Column({ type: "integer" })
  user_id!: number;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user!: User;

  @Index("idx_purchase_album_mbid")
  @Column({ type: "text" })
  album_mbid!: string;

  @Column({ type: "text" })
  artist_name!: string;

  @Column({ type: "text" })
  album_title!: string;

  @Column({ type: "integer" })
  price!: number;

  @Column({ type: "text" })
  currency!: string;

  @Index("idx_purchase_purchased_at")
  @CreateDateColumn({ type: "text" })
  purchased_at!: string;
}
