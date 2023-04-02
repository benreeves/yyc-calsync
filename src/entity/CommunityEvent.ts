import { EventSchema } from "src/services/event-schema";
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinTable,
    ManyToMany,
    JoinColumn,
} from "typeorm";
import { Community } from "./Community";
import { EventTag, OpportunityTag } from "./Tag";

/**
 * We track events internally to help with syncing and tracking over time. However,
 * we rely on the provider (google) APIs in order to extract most of the information
 */
@Entity()
export class CommunityEvent implements EventSchema {
    constructor(init?: Partial<CommunityEvent>) {
        Object.assign(this, init);
    }

    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column()
    externalId: string;

    @Column({ nullable: true })
    externalRecurringId: string;

    @Column()
    name: string;

    @Column({ nullable: true })
    location: string;

    @Column()
    startDate: Date;

    @Column()
    endDate: Date;

    @Column()
    description?: string;

    @Column({ nullable: true })
    link?: string;

    @Column()
    communityId: string;

    @ManyToOne((type) => Community, (comm) => comm.events)
    community: Community;

    @ManyToMany((type) => EventTag, (tag) => tag.events)
    @JoinTable()
    tags: EventTag[];
}

export function fromSchema(schema: EventSchema): CommunityEvent {
    const commEvent = new CommunityEvent({ ...schema });
    return commEvent;
}
