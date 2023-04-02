import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    OneToMany,
    ManyToMany,
    JoinTable,
} from "typeorm";
import { CommunityContact, Contact } from "./Contact";
import { CommunityEvent } from "./CommunityEvent";
import { ExternalResource } from "./ExternalResource";
import { Hub } from "./Hub";
import { Locale } from "./Locale";
import { Group } from "./Group";
import { CommunityTag } from "./Tag";

export enum CalendarSyncBehaviour {
    STANDARD = "Standard",
    NODELETE = "NoDelete",
    IGNORE = "Ignore",
}

@Entity()
export class Community implements Group {
    constructor(init?: Partial<Community>) {
        Object.assign(this, init);
    }
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column()
    name: string;

    @Column({ nullable: true })
    googleCalendarId: string | null;

    @Column({
        type: "enum",
        enum: CalendarSyncBehaviour,
        default: CalendarSyncBehaviour.STANDARD,
    })
    calendarSyncBehaviour?: CalendarSyncBehaviour;

    @Column()
    externalUrl?: string;

    @Column()
    description: string;

    @Column()
    logoUrl: string;

    @Column({ nullable: true })
    primaryColor: string;

    @Column((type) => Locale)
    locale: Locale;

    @OneToMany((type) => ExternalResource, (res) => res.community) // note: we will create author property in the Photo class below
    externalResources?: ExternalResource[];

    @ManyToMany((type) => Hub, (hub) => hub.communities)
    hubs: Hub[];

    @OneToMany((type) => CommunityContact, (contact) => contact.community)
    contacts?: CommunityContact[];

    @OneToMany((type) => CommunityEvent, (event) => event.community)
    events: CommunityEvent[];

    @ManyToMany((type) => CommunityTag, (tag) => tag.communities)
    @JoinTable()
    tags: CommunityTag[];
}
