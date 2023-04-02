import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from "typeorm";
import { AppUser } from "./AppUser";

@Entity()
export class Connector {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column()
    connectionType: string;

    @ManyToOne(() => AppUser)
    user: AppUser;
}
