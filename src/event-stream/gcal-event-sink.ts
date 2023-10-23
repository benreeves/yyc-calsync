import { Hub } from "../entity/Hub";
import { CalsyncRepository } from "../calsync-repository";
import { delay } from "../common";
import { CommunityEvent } from "../entity/CommunityEvent";
import { HubEventXref } from "../entity/HubEventXref";
import { logger } from "../logger";
import { EventSchema } from "../event-schema";
import { GCal, GCalFactory } from "../services/gcal";
import { EventSink } from "./event-source-sink";
import moment from "moment";

type SyncResult = {
    toAdd: CommunityEvent[],
    toUpdate: { communityEvent: CommunityEvent, gcalEvent: EventSchema }[],
    toDelete: string[]
};


export class GCalHubCalendarEventSink implements EventSink{
    private _calendar: GCal;
    /**
     *
     */
    constructor(
        private hub: Hub,
        private gcalFactory: GCalFactory,
        private repo: CalsyncRepository
    ) {
        if (!this.hub.googleCalendarId) {
            throw Error('Hub must be configured with a calendar id');
        }
    }


    async processEvents(events: CommunityEvent[]): Promise<void> {
        await this.createCalendarClient()
        const [currentEventsInCal, xrefEntries] = await this.fetchHubEventsForStream(events);
        const syncResult = this.getSyncOperations(events, currentEventsInCal, xrefEntries)
        await this.processToAdd(syncResult.toAdd);
        await this.processToUpdate(syncResult.toUpdate);
        await this.processToDelete(syncResult.toDelete);
    }

    private async createCalendarClient() {
        this._calendar = await this.gcalFactory.create(this.hub.googleCalendarId);
    }


    getSyncOperations(
        communityEvents: CommunityEvent[],
        hubGCalEvents: EventSchema[],
        xrefs: HubEventXref[]
    ): SyncResult {
        const toAdd: CommunityEvent[] = [];
        const toUpdate: { communityEvent: CommunityEvent, gcalEvent: EventSchema }[] = [];

        // Initialize delete list, we will remove all found events from here
        const toDelete: string[] = hubGCalEvents.map(x => x.externalId);
        
        for (const communityEvent of communityEvents) {
            const hubXref = xrefs.find(xref => xref.communityEventId === communityEvent.id);
            
            if (hubXref) {
                const gcalEvent = hubGCalEvents.find(x => x.externalId == hubXref.hubEventExternalId);
                if (gcalEvent) {
                    // Remove from delete list
                    const index = toDelete.indexOf(hubXref.hubEventExternalId);
                    if (index > -1) toDelete.splice(index, 1);
                    
                    if (this.needsPatch(gcalEvent, communityEvent)) {
                        toUpdate.push({ communityEvent, gcalEvent });
                    }
                }
            } else {
                toAdd.push(communityEvent);
            }
        }

        return { toAdd, toUpdate, toDelete };
    }

    async processToAdd(eventsToAdd: CommunityEvent[]): Promise<void> {
        for (const event of eventsToAdd) {
            const schema: EventSchema = { ...event };
            let createdGoogleId: string;

            try {
                const created = await this._calendar.createEvent(schema);
                createdGoogleId = created.id;
                logger.info(`Created new GCal event ${schema.name} @ ${schema.startDate}`);
                await delay(150);
            } catch (e) {
                logger.error(`Could not create new gcal event | ${e.message}\n stack trace - ${e.stack}`);
            }

            if (createdGoogleId) {
                try {
                    await this.repo.addEventXrefToDb(event, this.hub.id, createdGoogleId);
                    logger.info(`Added GCal/hub xref for ${schema.name} @ ${schema.startDate} | hubId: ${this.hub.id}`);
                } catch (e) {
                    logger.error(`Error adding event xref to database. Deleting from gcal. | ${e.message}\n stack trace - ${e.stack}`);
                    await this._calendar.deleteEvent(createdGoogleId);
                    logger.crit(`Error managing event xrefs! Failed on google delete after writing to db | ${e.message}\n stack trace - ${e.stack}`);
                }
            }
        }
    }

    async processToUpdate(eventsToUpdate: { communityEvent: CommunityEvent, gcalEvent: EventSchema }[]): Promise<void> {
        for (const { communityEvent, gcalEvent } of eventsToUpdate) {
            await this.patchEvent(communityEvent, gcalEvent.externalId);
            await delay(150);
        }
    }

    async processToDelete(eventIdsToDelete: string[]): Promise<void> {
        for (const gcalId of eventIdsToDelete) {
            try {
                await this._calendar.deleteEvent(gcalId);
                await delay(150);
            } catch (e) {
                logger.error(`Could not delete event ${gcalId} on hub cal ${this.hub.googleCalendarId} | ${e.message}\n stack trace - ${e.stack}`);
            }
        }
    }


    private async fetchHubEventsForStream(events: CommunityEvent[]): Promise<[EventSchema[], HubEventXref[]]> {
        const sd = moment().subtract(30, "days");
        const ed = moment().add(60, "days");
        const hubId = this.hub.id;

        const dbEventIds = events.map(x=> x.id);
        const xrefs = await this.repo.getEventXrefsByHubId(hubId, dbEventIds);

        // grab the events that currently exist in gcal. We do this so we only have to make one API call and
        // then we can do a local compare to see if we should patch anything
        const hubGCalEvents_ = await this._calendar.listEvents(sd, ed);
        return [hubGCalEvents_, xrefs];
    }

    private needsPatch(a: EventSchema, b: EventSchema) {
        const match =
            a.name == b.name &&
            a.description == b.description &&
            a.endDate.getTime() == b.endDate.getTime() &&
            a.startDate.getTime() == b.startDate.getTime() &&
            a.location == b.location;
        return !match;
    }

    private async patchEvent(
        communityEvent: CommunityEvent,
        googleCalendarId: string
    ) {
        const patch: EventSchema = {
            ...communityEvent,
            externalId: googleCalendarId
        };

        try {
            await this._calendar.patchEvent(patch);
        } catch (e) {
            logger.error(
                `Error patching external event. | ${e.message}\n stack trace - ${e.stack}`
            );
        }
    }
}