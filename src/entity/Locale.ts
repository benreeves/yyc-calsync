import { Entity, Column } from "typeorm";

export class Locale {
    @Column({ nullable: true })
    city?: string;

    @Column({ nullable: true })
    province?: string;

    @Column({ nullable: true })
    country?: string;
}
