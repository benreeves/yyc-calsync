import { CommunityEvent } from "../entity/CommunityEvent";
import { EventSchema } from "../event-schema";
import moment from "moment";

export interface EventSink {
    processEvents(events: CommunityEvent[]): Promise<void>;
}

export interface EventFeed {
    // This function produces a stream of EventSchema
    getEventStream(minDate?: moment.MomentInput, maxDate?: moment.MomentInput): Promise<EventSchema[]>;
    
    // This function converts an EventSchema to a CommunityEvent
    convertToCommunityEvent(eventSchema: EventSchema): CommunityEvent;
}