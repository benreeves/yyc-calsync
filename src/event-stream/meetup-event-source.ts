import { Community } from "../entity/Community";
import { CommunityEvent } from "../entity/CommunityEvent";
import { EventFeed } from "./event-source-sink";
import { EventSchema } from "../event-schema";
import { MeetupClient } from "../services/meetupClient";

export class MeetupEventSource implements EventFeed {
    constructor(
        public community: Community,
        private meetupClient: MeetupClient
    ) {}

    async getEventStream(minDate?: moment.MomentInput, maxDate?: moment.MomentInput): Promise<EventSchema[]> {
        // Considering we are focusing on a single community, 
        // only calling the getCommunityEvents method.
        const events = await this.meetupClient.getCommunityEvents(this.community.meetupUrl);
        return events;
    }

    convertToCommunityEvent(eventSchema: EventSchema): CommunityEvent {
        const evt = new CommunityEvent(eventSchema);
        evt.communityId = this.community.id;
        return evt;
    }
}