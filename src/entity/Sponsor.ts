import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinTable,
    OneToMany,
} from "typeorm";
import { SponsorContact } from "./Contact";
import { Hub } from "./Hub";

@Entity()
export class Sponsor {
    constructor(init?: Partial<Sponsor>) {
        Object.assign(this, init);
    }

    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column()
    name: string;

    @Column({ nullable: true })
    url: string;

    @Column({ nullable: true })
    logoUrl: string;

    @Column()
    featured: boolean;

    @ManyToOne(() => Hub, (hub) => hub.sponsors, { onDelete: "CASCADE" })
    hub: Hub;

    @OneToMany(() => SponsorContact, (contact) => contact.sponsor)
    contacts: SponsorContact[];
}
