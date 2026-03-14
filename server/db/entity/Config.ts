import { Entity, PrimaryColumn, Column } from "typeorm";

@Entity("config")
export class Config {
  @PrimaryColumn({ type: "integer" })
  id!: number;

  @Column({ type: "text" })
  data!: string;
}
