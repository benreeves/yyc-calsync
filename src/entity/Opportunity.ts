import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    OneToMany,
    TableInheritance,
    ManyToOne,
    JoinTable,
    ManyToMany,
} from "typeorm";
import { Hub } from "./Hub";
import { OpportunityTag } from "./Tag";

@Entity()
export class Opportunity {
    /**
     *
     */
    constructor(init?: Partial<Opportunity>) {
        Object.assign(this, init);
    }

    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column()
    type: string;

    @Column()
    title: string;

    @Column()
    description: string;

    @ManyToOne((type) => Hub, (hub) => hub.opportunities, {
        onDelete: "CASCADE",
    })
    hub: Hub;

    @ManyToMany((type) => OpportunityTag, (tag) => tag.opportunities)
    @JoinTable()
    tags: OpportunityTag[];
}
