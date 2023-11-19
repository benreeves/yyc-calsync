import { CommunityEvent } from "../entity/CommunityEvent";
import { EventSchema } from "../event-schema";


export enum ActionType {
  NONE = "NONE",
  ADD = "ADD",
  DELETE = "DELETE",
  UPDATE = "UPDATE"
}

export interface EventAction {
    action: ActionType
    event: CommunityEvent
}

export class EventFeedConsolidator {

    actions: EventAction[];

    constructor(
        private events: CommunityEvent[],
        private savedEvents: CommunityEvent[],
        private nodelete: boolean = false

    ) { 
        this.actions = this.processEvents()
    }

    getEventsToSave(): CommunityEvent[] {
        return this.actions
            .filter(action => action.action === ActionType.ADD)
            .map(action => action.event);
    }

    getEventsToDelete(): string[] {
        return this.actions
            .filter(action => action.action === ActionType.DELETE)
            .map(action => action.event.externalId);
    }

    getEventsToUpdate(): CommunityEvent[] {
        return this.actions
            .filter(action => action.action === ActionType.UPDATE)
            .map(action => action.event);
    }

    private processEvents(): EventAction[] {

        // Create a map for the combined event feeds
        const feedMap: { [key: string]: CommunityEvent } = {};
        for (const evt of this.events) {
            feedMap[evt.externalId] = evt;
        }

        // Populate DB map from saved events
        const dbMap: { [key: string]: CommunityEvent } = {};
        this.savedEvents.forEach(event => {
            dbMap[event.externalId] = event;
        });

        const actions: EventAction[] = [];

        // Loop through DB events to determine DELETE or UPDATE actions
        for (const [eid, evt] of Object.entries(dbMap)) {
            // The event no longer exists in the external feeds - DELETE!
            if (!feedMap[eid]) {
                if (!this.nodelete) {
                    actions.push({ action: ActionType.DELETE, event: evt });
                }
            } else {
                const feedEvent = feedMap[eid];
                if (this.needsPatch(feedEvent, evt)) {
                    const ogid = evt.id; // store original id so we dont override
                    Object.assign(evt, feedEvent);  // Update the DB event with the feed data
                    evt.id = ogid;
                    actions.push({ action: ActionType.UPDATE, event: evt });
                }
                // Remove the processed event from feedMap to avoid duplicate handling
                delete feedMap[eid];
            }
        }

        // Loop through the remaining events in the feedMap to determine ADD actions
        for (const evt of Object.values(feedMap)) {
            const toSAve = Object.assign({}, evt);
            toSAve.id = undefined; // No recycling ids
            actions.push({ action: ActionType.ADD, event: toSAve });
        }

        return actions;
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


}