export interface EventSchema {
    id?: string;
    externalId: string;
    externalRecurringId: string;
    location: string;
    name: string;
    startDate: Date;
    endDate: Date;
    description?: string;
    link?: string;
}
