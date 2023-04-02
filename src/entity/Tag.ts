import { Entity, PrimaryGeneratedColumn, Column, ManyToMany } from "typeorm";
import { Opportunity } from "./Opportunity";
import { CommunityEvent } from "./CommunityEvent";
import { Hub } from "./Hub";
import { Community } from "./Community";

@Entity()
export abstract class Tag {
    constructor(init?: Partial<Tag>) {
        Object.assign(this, init);
    }
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column()
    value: string;
}

@Entity()
export class OpportunityTag extends Tag {
    @ManyToMany((type) => Opportunity, (opp) => opp.tags)
    opportunities: Opportunity[];
}

@Entity()
export class EventTag extends Tag {
    @ManyToMany((type) => CommunityEvent, (evt) => evt.tags)
    events: CommunityEvent[];
}

@Entity()
export class CommunityTag extends Tag {
    @ManyToMany((type) => Community, (community) => community.tags)
    communities: Community[];
}

@Entity()
export class HubTag extends Tag {
    @ManyToMany((type) => Hub, (hub) => hub.tags)
    hubs: Hub[];
}
