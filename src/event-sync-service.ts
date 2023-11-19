import { CalsyncRepository } from "./calsync-repository";
import { Community } from "./entity/Community";
import { CommunityEvent } from "./entity/CommunityEvent";
import { Hub } from "./entity/Hub";
import { EventFeedConsolidator } from "./event-stream/event-feed-consolidator";
import { EventFeed, EventSink } from "./event-stream/event-source-sink";
import { GCalHubCalendarEventSink } from "./event-stream/gcal-event-sink";
import { GCalEventSource } from "./event-stream/gcal-event-source";
import { logger } from "./logger";
import { MeetupEventSource } from "./event-stream/meetup-event-source";
import { GCalFactory } from "./services/gcal";
import { MeetupClient } from "./services/meetupClient";
import { WebflowEventSink } from "./event-stream/webflow-event-sink";

export class EventSyncService {
    constructor(
        private hub: Hub,
        private repo: CalsyncRepository,
        private gcalFactory: GCalFactory,
        private meetupClient: MeetupClient,
    ) {}

    async sync(){
        try {
            logger.info('Starting sync process...');

            // Fetch all existing events
            const eventsFromFeeds = await this.fetchAllEventsFromFeeds();
            logger.info(`Fetched ${eventsFromFeeds.length} events from feeds`);
            if(eventsFromFeeds.length == 0) {
                logger.info(`No events, returning`);
                return
            }

            const savedEvents = await this.repo.getEventsForHub(this.hub.id);

            const consolidator = new EventFeedConsolidator(eventsFromFeeds, savedEvents, true);

            // Split events into save, update, delete, in database
            await this.repo.processEventActions(consolidator.actions);
            logger.info('Processed event actions in the repository');
            // Requery so that we have fully hydrated events
            const eventsInDb = await this.repo.getEventsForHub(this.hub.id);

            // Send events to the various sinks
            const sinks = this.getEventSinks();
            for(const sink of sinks) {
                await sink.processEvents(eventsInDb);
            }
            logger.info('Completed sending events to sinks');
        } catch (error) {
            logger.error('Error during sync:', error);
        }
    }

    async fetchAllEventsFromFeeds() {
        try {
            const communities = await this.repo.getCommunitiesByHub(this.hub.id);
            let allFeeds: EventFeed[] = [];

            for(let community of communities) {
                const sources = this.getEventSourcesFor(community);
                allFeeds.push(...sources);
            }

            let allEvents: CommunityEvent[] = [];
            for(let feed of allFeeds) {
                const feedEvents = await feed.getEventStream(null, null);
                const asCommunityEvents = feedEvents.map(x => feed.convertToCommunityEvent(x));
                allEvents.push(...asCommunityEvents);
            }

            return allEvents;
        } catch (error) {
            logger.error('Error fetching events from feeds:', error);
            return [];
        }
    }

    getEventSinks(): EventSink[] {
        // Hard coded sinks, could move to separate factory
        return [
            new GCalHubCalendarEventSink(this.hub, this.gcalFactory, this.repo),
            new WebflowEventSink(),
        ];
    }

    getEventSourcesFor(community: Community): EventFeed[] {
        const feeds: EventFeed[] = [];
        if(community.googleCalendarId) {
            logger.debug(`Creating gcal source for ${community.name}`)
            const gcal = new GCalEventSource(community, this.gcalFactory);
            feeds.push(gcal);
        }
        if(community.meetupUrl) {
            logger.debug(`Creating meetup source for ${community.name}`)
            const meetup = new MeetupEventSource(community, this.meetupClient);
            feeds.push(meetup);
        }

        return feeds;
    }
}