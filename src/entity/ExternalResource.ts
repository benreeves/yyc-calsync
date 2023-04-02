import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    TableInheritance,
    ChildEntity,
    ManyToOne,
} from "typeorm";
import { Community } from "./Community";

@Entity()
@TableInheritance({ column: { type: "varchar", name: "type" } })
export class ExternalResource {
    constructor(init?: Partial<ExternalResource>) {
        Object.assign(this, init);
    }

    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column()
    type: string;

    @Column()
    name?: string;

    @Column({ nullable: true })
    description?: string;

    @Column({ nullable: true })
    url?: string;

    @ManyToOne(
        (type) => Community,
        (community) => community.externalResources,
        { onDelete: "CASCADE" }
    )
    community: Community;
}

@ChildEntity()
export class SlackChannel extends ExternalResource {}

@ChildEntity()
export class DiscordServer extends ExternalResource {}

@ChildEntity()
export class MeetupPage extends ExternalResource {}
