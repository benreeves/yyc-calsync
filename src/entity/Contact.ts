import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    OneToMany,
    TableInheritance,
    ChildEntity,
    ManyToOne,
    OneToOne,
} from "typeorm";
import { Community } from "./Community";
import { Hub } from "./Hub";
import { Sponsor } from "./Sponsor";

@Entity()
@TableInheritance({ column: { type: "varchar", name: "type" } })
export class Contact {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column()
    name: string;

    @Column()
    type: string;

    @Column({ nullable: true })
    avatar: string;

    @Column()
    email: string;

    @Column({ nullable: true })
    phone?: string | null;
}

@Entity()
@ChildEntity()
export class CommunityContact extends Contact {
    @ManyToOne((type) => Community, (community) => community.contacts, {
        onDelete: "CASCADE",
    })
    community: Community;

    @Column()
    communityId: string;

    @Column()
    isPrimary: boolean;
}

@Entity()
@ChildEntity()
export class HubContact extends Contact {
    @ManyToOne((type) => Hub, (community) => community.contacts)
    hub: Hub;

    @Column()
    hubId: string;

    @Column()
    isPrimary: boolean;
}

@Entity()
@ChildEntity()
export class SponsorContact extends Contact {
    @ManyToOne((type) => Sponsor, (sponsor) => sponsor.contacts)
    sponsor: Sponsor;

    @Column()
    sponsorId: string;

    @Column()
    isPrimary: boolean;
}
