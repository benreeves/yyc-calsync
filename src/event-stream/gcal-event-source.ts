import { Community } from "../entity/Community";
import { GCalFactory } from "../services/gcal";
import { EventFeed } from "./event-source-sink";
import { CommunityEvent } from "../entity/CommunityEvent";
import { EventSchema } from "../event-schema";
import moment from "moment";
import { logger } from "../logger";

export class GCalEventSource implements EventFeed {
    /**
     *
     */
    constructor(
        public community: Community,
        private gcalFactory: GCalFactory
        ) {
            if (!community.googleCalendarId) {
                throw new Error('No google calendar configured for the provided community')
            }
        
    }

    async getEventStream(minDate?: moment.MomentInput, maxDate?: moment.MomentInput): Promise<EventSchema[]> {

        // Fetch events from google cals and database. Allow to throw on error
        var googleEvents = [];
        try{
            const cal = await this.gcalFactory.create(this.community.googleCalendarId);
            googleEvents = await cal.listEvents(minDate, maxDate);
        }catch(e){
            logger.error(
                `Failed fetching from google events for ${this.community.name}`
            );
        }

        return googleEvents;
    }

    convertToCommunityEvent(eventSchema: EventSchema): CommunityEvent {
        const evt = new CommunityEvent(eventSchema);
        evt.communityId = this.community.id;
        return evt;
    }

}