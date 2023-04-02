import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToMany,
    JoinTable,
    OneToOne,
    OneToMany,
} from "typeorm";
import { Community } from "./Community";
import { HubContact } from "./Contact";
import { ExternalResource } from "./ExternalResource";
import { Locale } from "./Locale";
import { Group } from "./Group";
import { Opportunity } from "./Opportunity";
import { Sponsor } from "./Sponsor";
import { HubTag } from "./Tag";

// cant import and extend community
@Entity()
export class Hub implements Group {
    constructor(init?: Partial<Hub>) {
        Object.assign(this, init);
    }
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column()
    name: string;

    @Column({ nullable: true })
    externalUrl?: string;

    @Column({ nullable: true })
    googleCalendarId?: string;

    @Column({ nullable: true })
    strapline?: string;

    @Column()
    description: string;

    @Column({ nullable: true })
    logoUrl: string;

    @Column({ nullable: true })
    primaryColor: string;

    @Column((type) => Locale)
    locale: Locale;

    @OneToMany((type) => ExternalResource, (res) => res.community) // note: we will create author property in the Photo class below
    externalResources?: ExternalResource[];

    @ManyToMany((type) => Community, (community) => community.hubs)
    @JoinTable()
    communities: Community[];

    @ManyToMany((type) => Hub, (hub) => hub.parents)
    @JoinTable({
        name: "hub_children", // table name for the junction table of this relation
        joinColumn: {
            name: "hubId",
            referencedColumnName: "id",
        },
        inverseJoinColumn: {
            name: "childHubId",
            referencedColumnName: "id",
        },
    })
    children?: Hub[];

    @ManyToMany((type) => Hub, (hub) => hub.children)
    parents?: Hub[];

    @OneToMany((type) => Opportunity, (opp) => opp.hub)
    opportunities?: Opportunity[];

    @OneToMany((type) => Sponsor, (sponsor) => sponsor.hub)
    sponsors: Sponsor[];

    @OneToMany((type) => HubContact, (contact) => contact.hub)
    contacts?: HubContact[];

    @ManyToMany((type) => HubTag, (tag) => tag.hubs)
    @JoinTable()
    tags: HubTag[];
}
