import { Entity, OneToOne, PrimaryGeneratedColumn, Column } from "typeorm";
import { AppUser } from "./AppUser";

@Entity()
export class UserProfile {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column({ nullable: true })
    publicEmail?: string;

    @Column({ nullable: true })
    phone?: string;

    @Column({ nullable: true })
    thumbnailUrl?: string;

    @OneToOne((type) => AppUser, (user) => user.userProfile)
    user: AppUser;
}
