import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  Index,
  JoinColumn,
} from "typeorm";
import { User } from "./User";

@Entity("sessions")
export class Session {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index("idx_sessions_token")
  @Column({ type: "text", unique: true })
  token!: string;

  @Index("idx_sessions_user_id")
  @Column({ type: "integer" })
  user_id!: number;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user!: User;

  @Index("idx_sessions_expires_at")
  @Column({ type: "text" })
  expires_at!: string;

  @CreateDateColumn({ type: "text" })
  created_at!: string;
}
