import { CommunityEvent } from "../entity/CommunityEvent";
import { EventSink } from "../event-stream/event-source-sink";
import { logger } from "../logger";
import Bottleneck from 'bottleneck';
import Webflow from 'webflow-api';

interface CMSItem {
	collectionId: string;
	fields: CMSEvent;
}

interface CMSEvent {
    name: string;
    slug: string;
    'event-date-start': string;
    'event-date-time-end': string;
    'summary-of-the-event': string;
    'full-description': string;
    'event-signup-link': string;
    'event-organizer': string;
    'event-featured-color': string;
    _archived: boolean;
    _draft: boolean;

}

export class WebflowEventSink implements EventSink {
    private webflow: Webflow;

    constructor() {
        this.webflow = new Webflow({ token: process.env.WEBFLOW_TOKEN });
    }

    async processEvents(events: CommunityEvent[]): Promise<void> {
        const existingEvents = await this.fetchExistingEvents();
        const {toCreate, toUpdate} = this.determineEventsToSync(events, existingEvents);
        // ditch toUpdate, not implemented yet
        await this.createEventsInWebflow(toCreate);
        // await this.postProcess();
    }

    async fetchExistingEvents(): Promise<CMSEvent[]> {
        const existingItems = await this.webflow.items({ collectionId: process.env.EVENTS_COLLECTION_ID });
        const castedItems: CMSEvent[] = existingItems.map(x => x as unknown).map(x => x as CMSEvent);
        // console.log(castedItems[0]);
        return castedItems;
    }

    determineEventsToSync(events: CommunityEvent[], existingEvents: CMSEvent[]): { toCreate: CommunityEvent[], toUpdate: CommunityEvent[] } {
        const existingByName = new Set(existingEvents.map(x=> x.name));
        const toCreate = [];
        const toUpdate = [];

        events.forEach(evt => {
            if (existingByName.has(evt.name)) {
                toUpdate.push(evt);
            } else {
                toCreate.push(evt);
            }
        });

        return { toCreate, toUpdate };
    }

    async createEventsInWebflow(events: CommunityEvent[]) {
        if(!events || events.length == 0) return [];
        const limiter = new Bottleneck({
            minTime: 1000
        });

        const tasks = events.map(item => {
            return limiter.schedule(() => this.createEventInWebflow(item));
        });

        const resArr = await Promise.all(tasks);
        const itemIds = resArr.map(x => x.id);
        await this.webflow.publishItems({
            collectionId: process.env.EVENTS_COLLECTION_ID,
            itemIds: itemIds,
            live: true
        });
        return resArr;
    }


	async createEventInWebflow(event: CommunityEvent) {
        const cmsItem = this.createCMSItem(event);
		try {
			logger.info(`Syncing item ${cmsItem.fields.name}`);
			const res = await this.webflow.createItem(cmsItem);
			return { ok: true, id: res._id, err: null };
		} catch (err) {
			logger.error(err);
			return { ok: false, id: null, err: err };
		}
	}

    async postProcess(): Promise<void> {
        await this.webflow.publishSite({
            siteId: process.env.WEBFLOW_SITE_ID!,
            domains: [process.env.WEBFLOW_SITE_SUBDOMAIN!],
        });
    }

    // Helper methods like createEventInWebflow, updateEventInWebflow, and str_to_slug go here
    createCMSItem(evt: CommunityEvent): CMSItem {
        const name = evt.name;
        const slug = this.strToSlug(name);
        const startDate = evt.startDate;
        const endDate = evt.endDate;
        const description = evt.description;
        const link = evt.link;
        const community = evt.community.name;
        const primaryColor = evt.community.primaryColor;

        return {
            collectionId: process.env.EVENTS_COLLECTION_ID!,
            fields: {
                name: name,
                slug: slug,
                'event-date-start': startDate.toISOString(),
                'event-date-time-end': endDate.toISOString(),
                'summary-of-the-event': description,
                'full-description': description,
                'event-signup-link': link,
                'event-organizer': community,
                'event-featured-color': primaryColor,
                _archived: false,
                _draft: false,
            }
        };

    }

    strToSlug(str: string): string {
        str = str.replace(/^\s+|\s+$/g, '');
        str = str.toLowerCase();
        var from = 'àáäâèéëêìíïîòóöôùúüûñç·/_,:;';
        var to = 'aaaaeeeeiiiioooouuuunc------';
        for (var i = 0, l = from.length; i < l; i++)
            str = str.replace(new RegExp(from.charAt(i), 'g'), to.charAt(i));

        str = str
            .replace(/[^a-z0-9 -]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-');

        return str;
    };
}
