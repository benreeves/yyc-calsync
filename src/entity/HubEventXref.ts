import {
    Column,
    Entity,
    JoinColumn,
    ManyToOne,
    OneToOne,
    PrimaryGeneratedColumn,
} from "typeorm";
import { CommunityEvent } from "./CommunityEvent";
import { Hub } from "./Hub";

/**
 * Cross reference for mapping hub calendar events to community google calendar events
 */
@Entity()
export class HubEventXref {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @ManyToOne((type) => Hub, { onDelete: "CASCADE" })
    @JoinColumn()
    hub: Hub;

    @ManyToOne((type) => CommunityEvent, {
        nullable: true,
        onDelete: "SET NULL",
    })
    @JoinColumn()
    communityEvent: CommunityEvent;

    @Column()
    hubId: string;

    @Column({ nullable: true })
    communityEventId: string;

    @Column()
    hubEventExternalId: string; // Hub events are saved to a google calendar, this is the mapping

    @Column()
    communityEventExternalId: string;
}
