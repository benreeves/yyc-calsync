import moment from "moment";
import { CalendarSyncBehaviour, Community } from "../entity/Community";
import { CommunityEvent } from "../entity/CommunityEvent";
import { HubEventXref } from "../entity/HubEventXref";
import { Hub } from "../entity/Hub";
import { GCal, GCalFactory } from "./gcal";
import { logger } from "../logger";
import { delay } from "../common";
import { calendar_v3 } from "googleapis";
import { EventSchema } from "./event-schema";
import { DataSource } from "typeorm";

export interface SyncOptions {
    minDate?: moment.MomentInput;
    maxDate?: moment.MomentInput;
    deleteNotFound?: boolean;
}

interface HubSyncPackage {
    hubGcalEvents: { [key: string]: EventSchema };
    hubDbEvents: { [key: string]: HubEventXref };
    communityDbEvents: { [key: string]: CommunityEvent };
    hub: Hub;
    deleteOld?: boolean;
}
/**
 * Provides functionality for syncing events from an external google calendar
 * into an internal database
 */
export class CalendarSyncService {
    /**
     *
     */
    constructor(
        private gcalFactory: GCalFactory,
        private connection: DataSource
    ) {}

    /**
     * Fetches events for a given community from their respective calendar and pushes them into
     * the hubsuite database.
     * @param communityId uuid for community
     * @param options Options specifying how to perform the sync process
     */
    public async syncCommunity(
        communityId: string,
        options?: SyncOptions
    ): Promise<CommunityEvent[]> {
        options = options || {};
        const repo = this.connection.getRepository(Community);
        const community = await repo.findOne({where: {id: communityId}});
        if (!community && !community.googleCalendarId) {
            throw new Error("No community or calendar found");
        }
        if (!options.deleteNotFound) {
            if (
                community.calendarSyncBehaviour ==
                CalendarSyncBehaviour.NODELETE
            ) {
                options.deleteNotFound = false;
            }
        }
        // Fetch events from google cals and database. Allow to throw on error
        const cal = await this.gcalFactory.create(community.googleCalendarId);
        const googleEvents = await cal.listEvents(
            options.minDate,
            options.maxDate
        );
        const eventRepo = this.connection.getRepository(CommunityEvent);
        const savedEvents = await eventRepo.find({ where: {communityId: community.id }});

        // split between events to delete and events to save
        const [toDelete, toSave] = this.splitEvents(
            googleEvents,
            savedEvents,
            communityId
        );

        // actually write to database
        await this.syncToDb(toDelete, toSave, options.deleteNotFound ?? true);
        return toSave;
    }

    /**
     * Fetches events for all communities in a given hub and pushes them into
     * the hubsuite database. Implementation calls syncCommunity for each community in the hub
     * @param hubId uuid for hub of interest
     * @param options Options specifying how to perform the sync process
     */
    public async syncHub(
        hubId: string,
        options?: SyncOptions
    ): Promise<CommunityEvent[]> {
        // get community ids
        const communities: {
            community_id: string;
        }[] = await this.connection
            .getRepository(Hub)
            .createQueryBuilder("hub")
            .innerJoinAndSelect("hub.communities", "community")
            .where("hub.id = :hubId", { hubId: hubId })
            .select("community.id")
            .getRawMany();

        // getRawMany returns objects, map out the id
        const commIds = communities.map((c) => c.community_id);
        const allEvents_ = await this.syncCalendarsWithRateLimits(
            commIds,
            options
        );
        const allEvents = allEvents_.reduce((acc, val) => acc.concat(val), []);
        return allEvents;
    }

    private async syncCalendarsWithRateLimits(
        commIds: string[],
        options: SyncOptions
    ): Promise<CommunityEvent[]> {
        let allEvents: CommunityEvent[] = [];
        // Google calendar API has a really annoying rate limit with no clear guidance. Doing this in series instead of parallel
        for (let i = 0; i < commIds.length; i++) {
            const cId = commIds[i];
            try {
                const commEvts = await this.syncCommunity(cId, options);
                allEvents = allEvents.concat(commEvts);
                await delay(250);
            } catch (e: any) {
                logger.error(
                    `Error syncing community ${cId} | ${e.message}\n stack trace - ${e.stack}`
                );
            }
        }
        return allEvents;
    }

    private async syncToDb(
        toDelete: string[],
        toSave: CommunityEvent[],
        deleteNotFound: boolean
    ): Promise<void> {
        const hasDelete = toDelete && toDelete.length && deleteNotFound;
        const hasSave = toSave && toSave.length;
        if (hasDelete || hasSave) {
            await this.connection.transaction(async (manager) => {
                if (toDelete && toDelete.length && deleteNotFound) {
                    await manager
                        .createQueryBuilder()
                        .delete()
                        .from(CommunityEvent)
                        .where("externalId IN (:...ids)", { ids: toDelete })
                        .execute();
                }

                await manager.getRepository(CommunityEvent).save(toSave);
            });
        }
    }

    /**
     * Syncs events from hubsuite database into shared calendar. This is a bit of a painful method
     * @param hubId
     */
    public async syncToSharedCalendar(hubId: string): Promise<void> {
        //----------------------------------
        // Each hub has a google calendar where it syncs child community events to. This way,
        // individual communities manage their own calendars and the changes are reflected in the
        // hub calendar. This procedure performs the sync process from communities ==> hub calendar
        //
        // Procedure is as follows:
        // 1. Fetch all events in the hubsuite DB for the given hub
        // 2. Fetch the hub info (id & calendar id)
        // 3. Fetch our internal record of xrefs from hub events to community events. This is necessary
        //    to map google calendar ids together
        // 4. For each community event in the database (source of truth):
        //    4a. If we have no record in the xref table, create a new google calendar entry in the
        //        hub calendar and save the xref record to our database
        //    4b. If we have a record of the xref, check to see if any fields have changed. If so,
        //        perform a patch with the updated fields.
        // 5. For any google calendar events that have been deleted in the child
        //    calendars, we delete on the google end. We do this by tracking which calendar events
        //    we have seen in both the google list and the hubsuite db list and deleting any remainders
        //----------------------------------

        const [updatePackage, cal] = await this.buildHubUpdatePackage(hubId);
        await this.internalHubSync(cal, updatePackage);

        // const promises: PromiseLike<any>[] = [];
        // for (const [communityId, communityEvent] of Object.entries(
        //     communityDbEvents
        // )) {
        //     const hubEvent = huubDbEvents[communityId];

        //     if (hubEvent) {
        //         // we found a record of a prior sync. Pass or patch
        //         const foundGCalEvent =
        //             hubGcalEvents[hubEvent.hubEventExternalId];
        //         // const foundGCalEvent = hubGCalEvents.find(x => x.externalId === hubEvent.hubEventExternalId);
        //         // don't know how this would happen
        //         if (!foundGCalEvent) {
        //             logger.error(
        //                 `Developer error! We have a record of a sync but no calendar event. | \n${JSON.stringify(
        //                     hubEvent
        //                 )}`
        //             );
        //             continue;
        //         }
        //         // remove from our tracking set
        //         delete hubGcalEvents[hubEvent.hubEventExternalId];
        //         if (this.needsPatch(foundGCalEvent, hubEvent.communityEvent)) {
        //             // delete from map. We use this map to see what leftovers we should delete
        //             const patch: EventSchema = {
        //                 ...communityEvent,
        //                 externalId: hubEvent.hubEventExternalId,
        //             };
        //             promises.push(
        //                 cal.patchEvent(patch).catch((e) => {
        //                     logger.error(
        //                         `Error patching external event. | ${e.message}\n stack trace - ${e.stack}`
        //                     );
        //                 })
        //             );
        //         }
        //     } else {
        //         // no hub event, create google event and add to our database
        //         // 1. Push to google
        //         // 2. Save to db
        //         // 3. If save fails, delete from google to prevent duplicates
        //         const schema: EventSchema = { ...communityEvent };
        //         const promise = cal
        //             .createEvent(schema)
        //             .then((created) =>
        //                 this.addXrefToDb(communityEvent, hub, created.id, cal)
        //             )
        //             .catch((e) => {
        //                 logger.crit(
        //                     `Error managing event xrefs! We failed on google delete after writing to db | ${e.message}\n stack trace - ${e.stack}`
        //                 );
        //             });
        //         promises.push(promise);
        //     }
        // }

        // // we delete entries as we process them, so anything left here means it no longer
        // // exists in the database. Time to delete.
        // const deletePromises = Object.entries(
        //     hubGcalEvents
        // ).map(([gcalId, _]) => cal.deleteEvent(hub.googleCalendarId, gcalId));
        // await Promise.all(promises.concat(deletePromises));
    }

    private async buildHubUpdatePackage(
        hubId: string
    ): Promise<[HubSyncPackage, GCal]> {
        const sd = moment().subtract(30, "days");
        const ed = moment().add(60, "days");

        const hub = await this.connection
            .getRepository(Hub)
            .findOne({where: {id: hubId}, select: ["id", "googleCalendarId"] });

        const dbEvents = await this.getDbEvents(hubId, sd, ed);

        // need separate query since we don't actually map through a join table. Could do this
        // with a right join, but typeorm doesn't support right join and i don't like xrefs bleeding
        // into entities unless its used in more than one place
        const xrefs = await this.getXrefs(hubId, dbEvents);

        // grab the events that currently exist in gcal. We do this so we only have to make one API call and
        // then we can do a local compare to see if we should patch anything. Otherwise, we would eagerly
        // fire off patch requests for every event in the hub
        const cal = await this.gcalFactory.create(hub.googleCalendarId);
        const hubGCalEvents_ = await cal.listEvents(sd, ed);

        // we use the gcal events to track what we want to delete
        const hubGcalEvents = hubGCalEvents_.reduce(
            (acc, cur) => ((acc[cur.externalId] = cur), acc),
            {}
        );
        // Events which currently exist in the db for a hub
        const huubDbEvents = xrefs.reduce(
            (acc, cur) => ((acc[cur.communityEventExternalId] = cur), acc),
            {}
        );
        // Events which exist in the db for the hubs communities
        const communityDbEvents = dbEvents.reduce(
            (acc, cur) => ((acc[cur.externalId] = cur), acc),
            {}
        );

        const updatePackage: HubSyncPackage = {
            hub: hub,
            communityDbEvents: communityDbEvents,
            hubDbEvents: huubDbEvents,
            hubGcalEvents: hubGcalEvents,
        };
        return [updatePackage, cal];
    }

    private addXrefToDb(
        communityEvent: CommunityEvent,
        hubCal: Hub,
        gid: string,
        cal: GCal
    ) {
        const xref = new HubEventXref();
        xref.communityEvent = communityEvent;
        xref.communityEventId = communityEvent.id;
        xref.communityEventExternalId = communityEvent.externalId;
        xref.hubId = hubCal.id;
        xref.hubEventExternalId = gid;
        return this.connection
            .getRepository(HubEventXref)
            .save(xref)
            .catch((e) => {
                logger.error(
                    `Error adding event xref to database. Deleting frog gcal. | ${e.message}\n stack trace - ${e.stack}`
                );
                cal.deleteEvent(hubCal.googleCalendarId, gid);
            });
    }

    private async getXrefs(hubId: string, dbEvents: CommunityEvent[]) {
        const xrefs = await this.connection
            .getRepository(HubEventXref)
            .createQueryBuilder("xref")
            .innerJoin("xref.hub", "hub")
            .innerJoinAndSelect("xref.communityEvent", "evt")
            .where("hub.id = :hubId", { hubId: hubId })
            .andWhere("evt.id IN (:...ids)", { ids: dbEvents.map((x) => x.id) })
            .getMany();
        xrefs.sort((a, b) => a.id.localeCompare(b.id));
        return xrefs;
    }

    private async getDbEvents(
        hubId: string,
        sd: moment.Moment,
        ed: moment.Moment
    ) {
        return await this.connection
            .getRepository(CommunityEvent)
            .createQueryBuilder("evt")
            .innerJoin("evt.community", "community")
            .innerJoin("community.hubs", "hub")
            .where("hub.id = :hubId", { hubId: hubId })
            .andWhere("evt.startDate >= :sd", { sd: sd })
            .andWhere("evt.endDate <= :ed", { ed: ed })
            .getMany();
    }

    private splitEvents(
        googleEvents: EventSchema[],
        savedEvents: CommunityEvent[],
        communityId: string
    ): [string[], CommunityEvent[]] {
        const gmap: { [key: string]: EventSchema } = googleEvents.reduce(
            (acc, cur) => ((acc[cur.externalId] = cur), acc),
            {}
        );
        const dbMap: { [key: string]: CommunityEvent } = savedEvents.reduce(
            (acc, cur) => ((acc[cur.externalId] = cur), acc),
            {}
        );

        const toDelete: string[] = [];
        const toSave: CommunityEvent[] = [];
        for (const [gid, evt] of Object.entries(dbMap)) {
            // in db, not in google. delete
            if (!gmap[gid]) {
                toDelete.push(evt.externalId);
                // in db and google, update on id
            } else {
                // to save
                Object.assign(evt, gmap[gid]);
                toSave.push(evt);
            }
        }
        for (const [gid, evt] of Object.entries(gmap)) {
            // in google calendar, not in db map. Create new
            if (!dbMap[gid]) {
                const event = new CommunityEvent(evt);
                event.communityId = communityId;
                toSave.push(event);
            }
        }
        return [toDelete, toSave];
    }

    private eventsSame(a: EventSchema, b: EventSchema) {
        return !this.needsPatch(a, b);
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

    /**
     * Syncs the events from a hubs children to the shared hub calendar. Runs slowly to prevent google API throttling
     * @param cal Calendar service
     * @param param1 Payload for performing sync
     */
    private async internalHubSync(
        cal: GCal,
        {
            hubGcalEvents,
            hubDbEvents,
            communityDbEvents,
            hub,
            deleteOld,
        }: HubSyncPackage
    ): Promise<any> {
        // 4. For each community event in the database (source of truth):
        //    4a. If we have no record in the xref table, create a new google calendar entry in the
        //        hub calendar and save the xref record to our database
        //    4b. If we have a record of the xref, check to see if any fields have changed. If so,
        //        perform a patch with the updated fields.
        // 5. For any google calendar events that have been deleted in the child
        //    calendars, we delete on the google end. We do this by tracking which calendar events
        //    we have seen in both the google list and the hubsuite db list and deleting any remainders

        for (const [cid, communityEvent] of Object.entries(communityDbEvents)) {
            const hubXref = hubDbEvents[cid];

            if (hubXref) {
                // we found a record of a prior sync. Pass or patch
                const gcalEvent = hubGcalEvents[hubXref.hubEventExternalId];
                // We have a dangling xref record but no calendar event. Delete dangling xref
                if (!gcalEvent) {
                    //
                    logger.warn(
                        `We have a record of a sync but no calendar event. Deleting xref id ${hubXref.id})}`
                    );
                    await this.connection
                        .createQueryBuilder()
                        .delete()
                        .from(HubEventXref)
                        .where("id = (:id)", { id: hubXref.id })
                        .execute();
                    continue;
                }
                // remove from our tracking set
                delete hubGcalEvents[hubXref.hubEventExternalId];
                if (this.needsPatch(gcalEvent, hubXref.communityEvent)) {
                    // delete from map. We use this map to see what leftovers we should delete
                    await this.patchEvent(communityEvent, hubXref, cal);
                    await delay(150);
                }
            } else {
                // no hub event, create google event and add to our database
                // 1. Push to google
                // 2. Save to db
                // 3. If save fails, delete from google to prevent duplicates
                const schema: EventSchema = { ...communityEvent };
                let createdGoogleId: string;

                // Do we already have a hub event matching this? This can happen if
                // the DB and gcal get out of sync
                const alreadyInCal = Object.values(hubGcalEvents).filter((x) =>
                    this.eventsSame(x, schema)
                );
                if (alreadyInCal.length) {
                    // pretend like we created the event so we can create the xref
                    createdGoogleId = alreadyInCal[0].externalId;
                } else {
                    try {
                        const created = await cal.createEvent(schema);
                        createdGoogleId = created.id;
                        logger.info(
                            `Created new GCal event ${schema.name} @ ${schema.startDate}`
                        );
                        await delay(150);
                    } catch (e) {
                        logger.error(
                            `Could not create new gcal event | ${e.message}\n stack trace - ${e.stack}`
                        );
                    }
                }
                if (!createdGoogleId) {
                    continue;
                } else {
                    delete hubGcalEvents[createdGoogleId];
                    try {
                        await this.addXrefToDb(
                            communityEvent,
                            hub,
                            createdGoogleId,
                            cal
                        );
                        logger.info(
                            `Added GCal/hub xref for ${schema.name} @ ${schema.startDate} | hubId: ${hub.id}`
                        );
                    } catch (e) {
                        logger.crit(
                            `Error managing event xrefs! We failed on google delete after writing to db | ${e.message}\n stack trace - ${e.stack}`
                        );
                    }
                }
            }
        }

        if (deleteOld) {
            // we delete entries as we process them, so anything left here means it no longer
            // exists in the database. Time to delete.
            for (const [gcalId, _] of Object.entries(hubGcalEvents)) {
                try {
                    await cal.deleteEvent(hub.googleCalendarId, gcalId);
                    await delay(150);
                } catch (e) {
                    logger.error(
                        `Could not event ${gcalId} on hub cal ${hub.googleCalendarId} | ${e.message}\n stack trace - ${e.stack}`
                    );
                }
            }
        }
    }

    private async patchEvent(
        communityEvent: CommunityEvent,
        hubEvent: HubEventXref,
        cal: GCal
    ) {
        const patch: EventSchema = {
            ...communityEvent,
            externalId: hubEvent.hubEventExternalId,
        };

        try {
            await cal.patchEvent(patch);
        } catch (e) {
            logger.error(
                `Error patching external event. | ${e.message}\n stack trace - ${e.stack}`
            );
        }
    }
}
