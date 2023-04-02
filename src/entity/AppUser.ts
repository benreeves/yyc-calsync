import { Column, Entity, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { UserProfile } from "./UserProfile";

@Entity()
export class AppUser {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column()
    firstName: string;

    @Column({ nullable: true })
    lastName: string | null;

    @Column()
    email: string;

    @Column()
    emailNormalized: string;

    @Column()
    emailConfirmed: boolean;

    @OneToOne((type) => UserProfile, (profile) => profile.user)
    userProfile?: UserProfile;
}
